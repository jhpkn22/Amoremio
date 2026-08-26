"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, PackagePlus } from "lucide-react";
import { useCarrito } from "@/lib/caja/store";
import { formatGs, cn } from "@/lib/utils";

/**
 * El override manual de precio queda admin-only: es la misma frontera
 * que "ve costos y márgenes" del brief — bajar un precio a mano toca
 * directamente el margen de la venta, así que la vendedora puede armar
 * el carrito, cambiar cantidades y sacar ítems, pero no reescribir el
 * precio de lista.
 */
export function CarritoVenta({ esAdmin }: { esAdmin: boolean }) {
  const { items, cambiarCantidad, cambiarPrecio, quitarItem } = useCarrito();
  const [editando, setEditando] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
        <PackagePlus size={28} className="text-rose-300" />
        <p className="text-[13.5px] text-ink-600">Escaneá o buscá un producto para empezar la venta.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const importe = item.cantidad * item.precio_unitario - item.descuento_item;
        const tieneOverride = item.precio_unitario !== item.precio_original;

        return (
          <li key={item.clave} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink-900">{item.nombre}</p>
                <p className="font-mono text-[11.5px] text-ink-600">{item.codigo}</p>
              </div>
              <button
                onClick={() => quitarItem(item.clave)}
                className="shrink-0 rounded-full p-1.5 text-ink-600 hover:bg-alert-soft hover:text-alert"
                aria-label="Quitar del carrito"
                data-mantiene-foco
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border" data-mantiene-foco>
                <button
                  onClick={() => cambiarCantidad(item.clave, item.cantidad - 1)}
                  className="p-2 text-ink-600 hover:text-ink-900"
                  aria-label="Restar unidad"
                >
                  <Minus size={14} />
                </button>
                <span className="tabular w-7 text-center text-[14px] font-semibold text-ink-900">{item.cantidad}</span>
                <button
                  onClick={() => cambiarCantidad(item.clave, item.cantidad + 1)}
                  className="p-2 text-ink-600 hover:text-ink-900"
                  aria-label="Sumar unidad"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {esAdmin && editando === item.clave ? (
                  <input
                    data-mantiene-foco
                    autoFocus
                    type="number"
                    min={0}
                    defaultValue={item.precio_unitario}
                    onBlur={(e) => {
                      cambiarPrecio(item.clave, Number(e.target.value) || 0);
                      setEditando(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="tabular min-h-9 w-24 rounded-lg border border-border-strong px-2 text-right text-[13.5px] font-semibold text-ink-900 focus:outline-none"
                  />
                ) : (
                  <button
                    disabled={!esAdmin}
                    onClick={() => setEditando(item.clave)}
                    data-mantiene-foco
                    className={cn(
                      "tabular text-[12.5px] text-ink-600",
                      esAdmin && "underline decoration-dotted underline-offset-4"
                    )}
                  >
                    {formatGs(item.precio_unitario)} c/u{tieneOverride && " · ajustado"}
                  </button>
                )}
                <span className="tabular text-[15px] font-bold text-ink-900">{formatGs(importe)}</span>
              </div>
            </div>

            {item.stock_disponible <= 0 && item.es_a_pedido && (
              <p className="mt-1.5 text-[11.5px] font-semibold text-rose-700">Sin stock — se vende a pedido</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
