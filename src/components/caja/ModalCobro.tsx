"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { X, Wallet, HandCoins } from "lucide-react";
import { useCarrito } from "@/lib/caja/store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field } from "@/components/ui/Field";
import { ClientePicker } from "./ClientePicker";
import { cn, formatGs } from "@/lib/utils";
import type { FormaPago } from "@/lib/types/database";

const FORMAS_CONTADO: { valor: FormaPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transfer." },
  { valor: "qr", etiqueta: "QR" },
];

/**
 * Se abre al tocar "Cobrar". Elegís cliente (si va a cuenta) y si se
 * paga al contado o se carga a la cuenta corriente. Al confirmar,
 * dispara el cobro real (onConfirmar) que ya arma el ticket e imprime.
 */
export function ModalCobro({
  supabase,
  onCerrar,
  onConfirmar,
  confirmando,
}: {
  supabase: SupabaseClient;
  onCerrar: () => void;
  onConfirmar: () => void;
  confirmando: boolean;
}) {
  const {
    total,
    formaPago,
    setFormaPago,
    clienteId,
    clienteNombre,
    setCliente,
    efectivoRecibido,
    setEfectivoRecibido,
    vuelto,
  } = useCarrito();

  const [modo, setModo] = useState<"contado" | "cuenta">(formaPago === "fiado" ? "cuenta" : "contado");

  function elegirModo(m: "contado" | "cuenta") {
    setModo(m);
    if (m === "cuenta") {
      setFormaPago("fiado");
    } else {
      setFormaPago("efectivo");
    }
  }

  const totalActual = total();
  const faltaCliente = modo === "cuenta" && !clienteId;
  const faltaEfectivo =
    modo === "contado" && formaPago === "efectivo" && efectivoRecibido != null && efectivoRecibido < totalActual;
  const puede = !confirmando && !faltaCliente && !faltaEfectivo;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-ink-900/40" aria-label="Cerrar" onClick={onCerrar} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">A cobrar</p>
            <p className="tabular text-[26px] font-bold text-rose-700">{formatGs(totalActual)}</p>
          </div>
          <button onClick={onCerrar} className="rounded-full p-1 text-ink-600 hover:bg-rose-50" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => elegirModo("contado")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13.5px] font-semibold",
              modo === "contado" ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
            )}
          >
            <HandCoins size={16} /> Al contado
          </button>
          <button
            type="button"
            onClick={() => elegirModo("cuenta")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-[13.5px] font-semibold",
              modo === "cuenta" ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
            )}
          >
            <Wallet size={16} /> A la cuenta
          </button>
        </div>

        {modo === "contado" ? (
          <>
            <Label>Forma de pago</Label>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {FORMAS_CONTADO.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => setFormaPago(f.valor)}
                  className={cn(
                    "min-h-10 rounded-xl border text-[12.5px] font-semibold",
                    formaPago === f.valor ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
                  )}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
            {formaPago === "efectivo" && (
              <Field className="mb-0">
                <Label opcional>Efectivo recibido</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  autoFocus
                  value={efectivoRecibido ?? ""}
                  onChange={(e) => setEfectivoRecibido(e.target.value ? Number(e.target.value) : null)}
                />
                {efectivoRecibido != null && efectivoRecibido >= totalActual && (
                  <p className="mt-1 text-[13px] font-semibold text-ink-900">Vuelto: {formatGs(vuelto())}</p>
                )}
                {faltaEfectivo && <p className="mt-1 text-[12.5px] font-medium text-alert">No alcanza para el total.</p>}
              </Field>
            )}
          </>
        ) : (
          <div>
            <Label>Cliente</Label>
            <ClientePicker
              supabase={supabase}
              clienteId={clienteId}
              clienteNombre={clienteNombre}
              onSeleccionar={setCliente}
            />
            {faltaCliente && <p className="mt-1 text-[12.5px] font-medium text-alert">Elegí o creá el cliente.</p>}
          </div>
        )}

        <Button tamaño="grande" className="mt-5 w-full" disabled={!puede} onClick={onConfirmar}>
          {confirmando ? "Cobrando…" : `Cobrar ${formatGs(totalActual)}`}
        </Button>
      </div>
    </div>
  );
}
