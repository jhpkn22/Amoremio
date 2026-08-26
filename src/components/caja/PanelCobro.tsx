"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCarrito } from "@/lib/caja/store";
import { formatGs, cn } from "@/lib/utils";
import { Input, Label, Field } from "@/components/ui/Field";
import { ClientePicker } from "./ClientePicker";
import type { FormaPago } from "@/lib/types/database";

const FORMAS: { valor: FormaPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transfer." },
  { valor: "qr", etiqueta: "QR" },
  { valor: "fiado", etiqueta: "Fiado" },
];

export function PanelCobro({ supabase }: { supabase: SupabaseClient }) {
  const {
    formaPago,
    setFormaPago,
    clienteId,
    clienteNombre,
    setCliente,
    descuentoGlobal,
    setDescuentoGlobal,
    efectivoRecibido,
    setEfectivoRecibido,
    subtotal,
    total,
    vuelto,
  } = useCarrito();

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <Label>Forma de pago</Label>
        <div className="grid grid-cols-4 gap-1.5" data-mantiene-foco>
          {FORMAS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFormaPago(f.valor)}
              className={cn(
                "min-h-11 rounded-xl border text-[12.5px] font-semibold transition-colors",
                formaPago === f.valor ? "border-rose-700 bg-rose-50 text-rose-700" : "border-border text-ink-600"
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {formaPago === "fiado" && (
        <div>
          <Label>Cliente</Label>
          <ClientePicker supabase={supabase} clienteId={clienteId} clienteNombre={clienteNombre} onSeleccionar={setCliente} />
        </div>
      )}

      <div className="flex items-center justify-between text-[13.5px] text-ink-600">
        <span>Subtotal</span>
        <span className="tabular">{formatGs(subtotal())}</span>
      </div>

      <Field className="mb-0">
        <Label opcional>Descuento (Gs.)</Label>
        <Input
          type="number"
          min={0}
          value={descuentoGlobal || ""}
          onChange={(e) => setDescuentoGlobal(Number(e.target.value) || 0)}
          data-mantiene-foco
        />
      </Field>

      {formaPago === "efectivo" && (
        <Field className="mb-0">
          <Label opcional>Efectivo recibido</Label>
          <Input
            type="number"
            min={0}
            value={efectivoRecibido ?? ""}
            onChange={(e) => setEfectivoRecibido(e.target.value ? Number(e.target.value) : null)}
            data-mantiene-foco
          />
        </Field>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-[15px] font-bold text-ink-900">TOTAL</span>
        <span className="tabular text-[24px] font-bold text-rose-700">{formatGs(total())}</span>
      </div>

      {formaPago === "efectivo" && efectivoRecibido != null && (
        <div className="flex items-center justify-between text-[14px] font-semibold text-ink-900">
          <span>Vuelto</span>
          <span className="tabular">{formatGs(vuelto())}</span>
        </div>
      )}
    </div>
  );
}
