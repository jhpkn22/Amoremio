"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, AlertCircle, Ticket as TicketIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCarrito } from "@/lib/caja/store";
import { buscarPorCodigo } from "@/lib/caja/buscar";
import { confirmarVentaCaja } from "@/lib/caja/confirmar";
import { cargarConfiguracionCaja } from "@/lib/caja/configuracion";
import { imprimir, hayImpresoraGuardada, ErrorImpresion } from "@/lib/ticket/imprimir";
import { DATOS_NEGOCIO_DEFECTO, type ConfigTicket } from "@/lib/ticket/escpos";
import type { RutaImpresion } from "@/lib/ticket/imprimir";
import type { CajaTurno } from "@/lib/types/database";
import { EscanerInput } from "./EscanerInput";
import { EscanerCamara } from "./EscanerCamara";
import { BusquedaManual } from "./BusquedaManual";
import { CarritoVenta } from "./CarritoVenta";
import { PanelCobro } from "./PanelCobro";
import { ModalCobro } from "./ModalCobro";
import { PantallaImpresion } from "./PantallaImpresion";
import { EstadoConexion } from "./EstadoConexion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatGs } from "@/lib/utils";

interface Props {
  turno: CajaTurno;
  almacenId: string;
  usuarioNombre: string;
  esAdmin: boolean;
}

type Aviso = { tipo: "error" | "exito"; texto: string } | null;

export function PosCliente({ turno, almacenId, usuarioNombre, esAdmin }: Props) {
  const [supabase] = useState(() => createClient());
  const { items, formaPago, clienteId, agregarItem, total, efectivoRecibido, descuentoGlobal, limpiar } = useCarrito();

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [fase, setFase] = useState<null | "registrando" | "imprimiendo">(null);
  const [config, setConfig] = useState<{ ruta: RutaImpresion; ticket: ConfigTicket } | null>(null);
  const confirmando = fase !== null;

  useEffect(() => {
    cargarConfiguracionCaja(supabase).then((c) => setConfig({ ruta: c.rutaImpresion, ticket: c.configTicket }));
  }, [supabase]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(id);
  }, [aviso]);

  async function alEscanear(codigo: string) {
    const item = await buscarPorCodigo(supabase, codigo, almacenId);
    if (!item) {
      setAviso({ tipo: "error", texto: `No encontramos ningún artículo con el código "${codigo}".` });
      return;
    }
    if (item.stock_disponible <= 0) {
      setAviso({ tipo: "error", texto: `"${item.nombre}" no tiene stock en este almacén (se agrega igual, el stock puede quedar negativo).` });
    }
    agregarItem(item);
  }

  async function alDetectarPorCamara(codigo: string) {
    setMostrarCamara(false);
    await alEscanear(codigo);
  }

  async function cobrar() {
    if (confirmando) return;
    setFase("registrando");
    setAviso(null);
    try {
      const cfg = config ?? { ruta: "web_bluetooth" as RutaImpresion, ticket: { anchoMm: 58 as const, charsPorLinea: 32 } };
      const resultado = await confirmarVentaCaja(
        {
          supabase,
          turnoId: turno.id,
          almacenId,
          vendedorNombre: usuarioNombre,
          items,
          descuentoGlobal,
          formaPago,
          clienteId: formaPago === "fiado" ? clienteId : null,
          efectivoRecibido: formaPago === "efectivo" ? efectivoRecibido : null,
        },
        cfg.ticket,
        DATOS_NEGOCIO_DEFECTO
      );

      let avisoImpresion = "";
      try {
        setFase("imprimiendo");
        await imprimir(resultado.ticketBytes, cfg.ruta);
      } catch (e) {
        avisoImpresion =
          e instanceof ErrorImpresion
            ? ` La venta se guardó, pero no se pudo imprimir: ${e.message}`
            : " La venta se guardó, pero no se pudo imprimir el ticket.";
      }

      const numero =
        resultado.numeroTicket != null
          ? `Nº ${String(resultado.numeroTicket).padStart(6, "0")}`
          : "pendiente de sincronizar";
      setAviso({
        tipo: "exito",
        texto: resultado.offline
          ? `Venta guardada offline (${numero}). Se va a sincronizar sola apenas vuelva la señal.${avisoImpresion}`
          : `Venta confirmada — Ticket ${numero}.${avisoImpresion}`,
      });
      limpiar();
      setMostrarCobro(false);
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo registrar la venta. Intentá de nuevo." });
    } finally {
      setFase(null);
    }
  }

  if (!almacenId) {
    return (
      <Card className="mx-auto max-w-md">
        <p className="text-[14px] font-semibold text-ink-900">Este turno se abrió sin almacén</p>
        <p className="mt-1 text-[13px] text-ink-600">
          Cerrá el turno y volvé a abrirlo eligiendo el almacén desde el que vas a vender.
        </p>
        <Button href="/panel/caja/cierre" className="mt-3">
          Ir a cerrar turno
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Caja</h1>
          <p className="text-[13px] text-ink-600">Turno abierto · {formatGs(turno.monto_inicial)} inicial</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstadoConexion />
          <Button href="/panel/caja/ventas" variante="fantasma">
            Ventas
          </Button>
          <Button href="/panel/caja/configuracion" variante="fantasma">
            Impresora
          </Button>
          <Button href="/panel/caja/cierre" variante="secundario">
            Cerrar turno
          </Button>
        </div>
      </div>

      {aviso && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-xl border p-3 text-[13.5px] ${
            aviso.tipo === "exito" ? "border-success bg-success-soft text-success" : "border-alert bg-alert-soft text-alert"
          }`}
        >
          {aviso.tipo === "exito" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{aviso.texto}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <EscanerInput activo={!mostrarCamara && !mostrarCobro} onEscaneo={alEscanear} />
            </div>
            <button
              onClick={() => setMostrarCamara(true)}
              data-mantiene-foco
              className="flex min-h-14 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-ink-900 hover:bg-rose-50"
              aria-label="Escanear con la cámara"
            >
              <Camera size={20} />
            </button>
          </div>

          <BusquedaManual supabase={supabase} almacenId={almacenId} onSeleccionar={agregarItem} />

          <CarritoVenta esAdmin={esAdmin} />

          {items.length > 0 && !hayImpresoraGuardada() && config?.ruta === "web_bluetooth" && (
            <p className="flex items-center gap-1.5 text-[12px] text-ink-600">
              <TicketIcon size={13} /> Todavía no emparejaste una impresora — se te va a pedir al confirmar la primera venta.
            </p>
          )}
        </div>

        <div>
          <Card>
            <PanelCobro />
            <Button
              tamaño="grande"
              className="mt-4 w-full"
              disabled={items.length === 0 || confirmando}
              onClick={() => setMostrarCobro(true)}
            >
              Cobrar {formatGs(total())}
            </Button>
          </Card>
        </div>
      </div>

      {mostrarCamara && <EscanerCamara onDetectado={alDetectarPorCamara} onCerrar={() => setMostrarCamara(false)} />}
      {mostrarCobro && (
        <ModalCobro
          supabase={supabase}
          confirmando={confirmando}
          onCerrar={() => setMostrarCobro(false)}
          onConfirmar={cobrar}
        />
      )}
      {fase && <PantallaImpresion fase={fase} />}
    </div>
  );
}
