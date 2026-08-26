"use client";

import { ShoppingCart } from "lucide-react";
import { useCarrito } from "@/lib/carrito/CartContext";

export function CartButton() {
  const { cantidadTotal, abrirCarrito } = useCarrito();

  return (
    <button
      type="button"
      onClick={abrirCarrito}
      aria-label="Ver carrito"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-900 hover:bg-white/50"
    >
      <ShoppingCart size={22} strokeWidth={2.2} />
      {cantidadTotal > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-700 px-1 text-[11px] font-bold text-white">
          {cantidadTotal}
        </span>
      )}
    </button>
  );
}
