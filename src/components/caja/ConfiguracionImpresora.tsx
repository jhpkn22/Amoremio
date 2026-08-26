"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { guardarConfiguracionCaja, type ConfiguracionCaja } from "@/lib/caja/configuracion";
import { construirTicketPrueba, DATOS_NEGOCIO_DEFECTO } from "@/lib/ticket/escpos";
import { imprimir, olvidarImpresoraEmparejada, hayImpresoraGuardada, ErrorImpresion, type RutaImpresion } from "@/lib/ticket/imprimir";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label, Select, Field } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const ANCHOS: { anchoMm: 58 | 80; charsPorLinea: number; etiqueta: string }[] = [
  { anchoMm: 58, charsPorLinea: 32, etiqueta: "58mm (Dronic P503A) — 32 caracteres" },
  { anchoMm: 80, charsPorLinea: 48, etiqueta: "80mm — 48 caracteres" },
];

export function ConfiguracionImpresora({
  esAdmin,
  configuracionInicial,
}: {
  esAdmin: boolean;
  configuracionInicial: ConfiguracionCaja;
}) {
  const [ruta, setRuta] = useState<RutaImpresion>(configuracionInicial.rutaImpresion);
  const [anchoMm, setAnchoMm] = useState<58 | 80>(configuracionInicial.configTicket.anchoMm);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  // hayImpresoraGuardada() ya es segura en SSR (chequea `typeof window`),
  // así que el valor real se calcula en el primer render del cliente sin
  // necesidad de un efecto aparte.
  const [impresoraGuardada, setImpresoraGuardada] = useState(() => hayImpresoraGuardada());
  const [aviso, setAviso] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);

  const charsPorLinea = ANCHOS.find((a) => a.anchoMm === anchoMm)?.charsPorLinea ?? 32;

  async function guardar() {
    setGuardando(true);
    setAviso(null);
    try {
      const supabase = createClient();
      await guardarConfiguracionCaja(supabase, { rutaImpresion: ruta, configTicket: { anchoMm, charsPorLinea } });
      setAviso({ tipo: "exito", texto: "Configuración guardada para todas las cajas." });
    } catch {
      setAviso({ tipo: "error", texto: "No se pudo guardar. Revisá tu conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function probar() {
    setProbando(true);
    setAviso(null);
    try {
      const bytes = construirTicketPrueba(DATOS_NEGOCIO_DEFECTO, { anchoMm, charsPorLinea });
      await imprimir(bytes, ruta);
      setImpresoraGuardada(hayImpresoraGuardada());
      setAviso({ tipo: "exito", texto: "Ticket de prueba enviado." });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ErrorImpresion ? e.message : "No se pudo imprimir." });
    } finally {
      setProbando(false);
    }
  }

  function olvidar() {
    olvidarImpresoraEmparejada();
    setImpresoraGuardada(false);
    setAviso({ tipo: "exito", texto: "Impresora olvidada. La próxima impresión te va a pedir emparejar de nuevo." });
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href="/panel/caja" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver a Caja
      </Link>

      <h1 className="mb-1 text-[20px] font-bold text-ink-900">Impresora de tickets</h1>
      <p className="mb-4 text-[13.5px] text-ink-600">
        La térmica Bluetooth de 58mm. Cada dispositivo empareja su propia impresora — la ruta y el ancho de papel son
        compartidos entre todas las cajas.
      </p>

      {aviso && (
        <div
          className={cn(
            "mb-4 flex items-start gap-2 rounded-xl border p-3 text-[13.5px]",
            aviso.tipo === "exito" ? "border-success bg-success-soft text-success" : "border-alert bg-alert-soft text-alert"
          )}
        >
          {aviso.tipo === "exito" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <span>{aviso.texto}</span>
        </div>
      )}

      <Card className="mb-4">
        <Field>
          <Label htmlFor="ruta">Ruta de impresión</Label>
          <Select id="ruta" value={ruta} onChange={(e) => setRuta(e.target.value as RutaImpresion)} disabled={!esAdmin}>
            <option value="web_bluetooth">Web Bluetooth (directo desde el navegador)</option>
            <option value="rawbt">RawBT (app puente en Android)</option>
          </Select>
        </Field>
        <Field className="mb-0">
          <Label htmlFor="ancho">Ancho de papel</Label>
          <Select id="ancho" value={anchoMm} onChange={(e) => setAnchoMm(Number(e.target.value) as 58 | 80)} disabled={!esAdmin}>
            {ANCHOS.map((a) => (
              <option key={a.anchoMm} value={a.anchoMm}>
                {a.etiqueta}
              </option>
            ))}
          </Select>
        </Field>
        {esAdmin ? (
          <Button onClick={guardar} disabled={guardando} className="mt-4 w-full">
            {guardando ? "Guardando…" : "Guardar configuración"}
          </Button>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-600">Solo la administradora puede cambiar estos valores.</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-[13.5px] font-semibold text-ink-900">Esta impresora (este dispositivo)</p>
        <p className="mb-3 text-[12.5px] text-ink-600">
          {ruta === "web_bluetooth"
            ? impresoraGuardada
              ? "Ya hay una impresora emparejada en este dispositivo."
              : "Todavía no emparejaste ninguna impresora acá — la prueba te la va a pedir."
            : "Con RawBT, la impresora la elige la app RawBT instalada en este teléfono."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={probar} disabled={probando} variante="secundario">
            <Printer size={16} /> {probando ? "Imprimiendo…" : "Prueba de impresión"}
          </Button>
          {ruta === "web_bluetooth" && impresoraGuardada && (
            <Button onClick={olvidar} variante="fantasma">
              <Trash2 size={16} /> Olvidar impresora
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
