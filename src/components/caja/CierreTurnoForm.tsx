"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cargarConfiguracionCaja } from "@/lib/caja/configuracion";
import { construirTicketCierreTurno, DATOS_NEGOCIO_DEFECTO } from "@/lib/ticket/escpos";
import { imprimir } from "@/lib/ticket/imprimir";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Field, CampoError } from "@/components/ui/Field";
import { formatGs, cn } from "@/lib/utils";
import type { CajaTurno } from "@/lib/types/database";

const ETIQUETAS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  qr: "QR",
  fiado: "Fiado",
};

export function CierreTurnoForm({
  turno,
  usuarioNombre,
  resumen,
  totalVentas,
  esperado,
}: {
  turno: CajaTurno;
  usuarioNombre: string;
  resumen: Record<string, { cantidad: number; total: number }>;
  totalVentas: number;
  esperado: number;
}) {
  const router = useRouter();
  const [contado, setContado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contadoNum = contado.trim() === "" ? null : Number(contado);
  const diferencia = contadoNum != null ? contadoNum - esperado : null;

  async function cerrar() {
    if (contadoNum == null || !Number.isFinite(contadoNum) || contadoNum < 0) {
      setError("Contá el efectivo en caja e ingresá el monto.");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();

    const { data: turnoActualizado, error: errRpc } = await supabase.rpc("cerrar_turno", {
      p_turno_id: turno.id,
      p_monto_final_contado: contadoNum,
    });

    if (errRpc) {
      setEnviando(false);
      setError(errRpc.message || "No se pudo cerrar el turno. Intentá de nuevo.");
      return;
    }

    try {
      const cfg = await cargarConfiguracionCaja(supabase);
      const bytes = construirTicketCierreTurno(
        {
          vendedorNombre: usuarioNombre,
          abiertoAt: new Date(turno.abierto_at),
          cerradoAt: turnoActualizado?.cerrado_at ? new Date(turnoActualizado.cerrado_at) : new Date(),
          montoInicial: turno.monto_inicial,
          ventasPorFormaPago: resumen,
          totalVentas,
          montoFinalEsperado: esperado,
          montoFinalContado: contadoNum,
          diferencia: contadoNum - esperado,
        },
        DATOS_NEGOCIO_DEFECTO,
        cfg.configTicket
      );
      await imprimir(bytes, cfg.rutaImpresion);
    } catch {
      // el cierre ya quedó guardado en la base — no imprimir el comprobante no es motivo para bloquear
    }

    router.push("/panel/caja");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-[20px] font-bold text-ink-900">Cerrar turno</h1>
      <p className="mb-4 text-[13.5px] text-ink-600">Contá el efectivo físico en caja y comparalo con lo esperado.</p>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between text-[13.5px] text-ink-600">
          <span>Monto inicial</span>
          <span className="tabular">{formatGs(turno.monto_inicial)}</span>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          {Object.entries(resumen).length === 0 && <p className="text-[13px] text-ink-600">Sin ventas en este turno.</p>}
          {Object.entries(resumen).map(([forma, r]) => (
            <div key={forma} className="flex items-center justify-between text-[13.5px]">
              <span className="text-ink-600">
                {ETIQUETAS[forma] ?? forma} ({r.cantidad})
              </span>
              <span className="tabular font-semibold text-ink-900">{formatGs(r.total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[14px] font-bold text-ink-900">
          <span>Total vendido</span>
          <span className="tabular">{formatGs(totalVentas)}</span>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between text-[15px] font-bold text-ink-900">
          <span>Esperado en caja</span>
          <span className="tabular">{formatGs(esperado)}</span>
        </div>
        <Field className="mb-0">
          <Label htmlFor="contado">Contado en caja</Label>
          <Input
            id="contado"
            type="number"
            min={0}
            inputMode="numeric"
            autoFocus
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            placeholder="0"
          />
          <CampoError>{error}</CampoError>
        </Field>
        {diferencia !== null && (
          <p
            className={cn(
              "mt-2 flex items-center gap-1.5 text-[13.5px] font-semibold",
              diferencia === 0 ? "text-success" : "text-alert"
            )}
          >
            {diferencia !== 0 && <AlertCircle size={15} />}
            Diferencia: {diferencia >= 0 ? "+" : ""}
            {formatGs(diferencia)}
          </p>
        )}
      </Card>

      <div className="flex gap-2">
        <Button variante="secundario" href="/panel/caja" className="flex-1">
          Volver
        </Button>
        <Button tamaño="grande" className="flex-1" disabled={enviando} onClick={cerrar}>
          {enviando ? "Cerrando…" : "Cerrar turno"}
        </Button>
      </div>
    </div>
  );
}
