"use client";

import { useCarrito } from "@/lib/caja/store";
import { formatGs } from "@/lib/utils";
import { Input, Label, Field } from "@/components/ui/Field";

/**
 * Resumen del carrito: subtotal, descuento global y total. La elección
 * de forma de pago / cliente vive en el modal de cobro (ModalCobro).
 */
export function PanelCobro() {
  const { descuentoGlobal, setDescuentoGlobal, subtotal, total } = useCarrito();

  return (
    <div className="flex flex-col gap-3.5">
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

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-[15px] font-bold text-ink-900">TOTAL</span>
        <span className="tabular text-[24px] font-bold text-rose-700">{formatGs(total())}</span>
      </div>
    </div>
  );
}
