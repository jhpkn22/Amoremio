"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCarrito } from "@/lib/carrito/CartContext";

interface Props {
  producto_id: string;
  nombre: string;
  codigo_interno: string;
  precio_unitario: number;
  foto: string | null;
}

// Detiene la propagación para que el botón no dispare el <Link> de la tarjeta
// (la tarjeta entera es clickeable para ir al detalle del producto).
function detener(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function BotonAgregarCarrito(props: Props) {
  const { items, agregar, actualizarCantidad } = useCarrito();
  const enCarrito = items.find((i) => i.producto_id === props.producto_id);
  const cantidad = enCarrito?.cantidad ?? 0;

  // Sin unidades en el carrito: mostramos el ícono simple de "agregar".
  if (cantidad === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          detener(e);
          agregar(props);
        }}
        aria-label={`Agregar ${props.nombre} al carrito`}
        className="mt-2.5 flex min-h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong text-rose-700 hover:bg-rose-50"
      >
        <ShoppingCart size={16} />
      </button>
    );
  }

  // Ya hay unidades: mostramos el selector de cantidad (- cantidad +) en su lugar.
  return (
    <div
      onClick={detener}
      className="mt-2.5 flex min-h-10 flex-1 items-center justify-between overflow-hidden rounded-lg border border-rose-700 bg-rose-700 text-white"
    >
      <button
        type="button"
        onClick={(e) => {
          detener(e);
          actualizarCantidad(props.producto_id, cantidad - 1);
        }}
        aria-label="Quitar una unidad"
        className="flex h-10 w-7 shrink-0 items-center justify-center hover:bg-rose-800"
      >
        <Minus size={13} />
      </button>
      <span className="tabular flex-1 px-0.5 text-center text-[12.5px] font-bold">{cantidad}</span>
      <button
        type="button"
        onClick={(e) => {
          detener(e);
          actualizarCantidad(props.producto_id, cantidad + 1);
        }}
        aria-label="Agregar una unidad más"
        className="flex h-10 w-7 shrink-0 items-center justify-center hover:bg-rose-800"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
