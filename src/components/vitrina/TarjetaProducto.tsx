"use client";

import Link from "next/link";
import { MessageCircle, ImageOff } from "lucide-react";
import { cn, formatGs } from "@/lib/utils";
import { urlFotoProducto } from "@/lib/supabase/storage";
import { linkWhatsApp } from "@/lib/whatsapp";
import { BotonAgregarCarrito } from "@/components/vitrina/BotonAgregarCarrito";
import { useCarrito } from "@/lib/carrito/CartContext";
import type { Producto } from "@/lib/types/database";

// El trazo signature (plan de diseño, sección 6) en vez de un badge de
// texto genérico "Personalizado" para marcar productos a pedido.
function TrazoAPedido() {
  return (
    <svg viewBox="0 0 100 48" className="h-4 w-9 text-rose-600" aria-hidden>
      <path
        d="M4 38 C 4 18, 22 8, 38 14 C 50 19, 42 32, 52 29 C 66 25, 68 9, 84 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TarjetaProducto({ producto, numeroWhatsApp }: { producto: Producto; numeroWhatsApp: string }) {
  // Cuando el producto ya está en el carrito, achicamos el botón de WhatsApp
  // a solo el ícono (sin texto) para que entre bien el selector de cantidad.
  const { items } = useCarrito();
  const enCarrito = items.find((i) => i.producto_id === producto.id);
  const cantidad = enCarrito?.cantidad ?? 0;

  const foto = producto.producto_fotos?.[0];
  const mensaje = `Hola! Te escribo por "${producto.nombre}" (${producto.codigo_interno}) que vi en la página. ¿Me contás más?`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Link href={`/producto/${producto.id}`} className="relative block aspect-square bg-rose-50">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFotoProducto(foto.path_thumbnail ?? foto.path_original)}
            alt={producto.nombre}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff size={28} className="text-rose-300" />
          </div>
        )}
        {producto.es_a_pedido && (
          <span className="absolute right-2 top-2 rounded-full bg-surface/90 p-1.5 shadow-sm" title="A pedido">
            <TrazoAPedido />
          </span>
        )}
      </Link>
      <div className="p-3">
        <Link href={`/producto/${producto.id}`}>
          <p className="truncate text-[14px] font-semibold text-ink-900">{producto.nombre}</p>
        </Link>
        <p className="tabular mt-0.5 text-[15px] font-bold text-rose-700">{formatGs(producto.precio_venta)}</p>
        <div className="flex gap-1.5">
          <a
            href={linkWhatsApp(numeroWhatsApp, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar por WhatsApp"
            className={cn(
              "mt-2.5 flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-rose-600 text-[12.5px] font-bold text-ink-900 hover:bg-rose-700 hover:text-white",
              cantidad > 0 ? "w-10 shrink-0" : "flex-1"
            )}
          >
            <MessageCircle size={14} />
            {cantidad === 0 && "WhatsApp"}
          </a>
          <BotonAgregarCarrito
            producto_id={producto.id}
            nombre={producto.nombre}
            codigo_interno={producto.codigo_interno}
            precio_unitario={producto.precio_venta}
            foto={foto ? urlFotoProducto(foto.path_thumbnail ?? foto.path_original) : null}
          />
        </div>
      </div>
    </div>
  );
}
