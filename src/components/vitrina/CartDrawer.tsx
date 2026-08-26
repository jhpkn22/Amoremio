"use client";

import { X, Minus, Plus, Trash2, MessageCircle, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCarrito } from "@/lib/carrito/CartContext";
import { formatGs } from "@/lib/utils";
import { linkWhatsApp } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/client";

export function CartDrawer({ numeroWhatsApp }: { numeroWhatsApp: string }) {
  const { items, total, abierto, cerrarCarrito, actualizarCantidad, quitar, vaciar } = useCarrito();
  const [enviando, setEnviando] = useState(false);

  if (!abierto) return null;

  async function enviarPorWhatsApp() {
    setEnviando(true);

    const lineas = items.map((i) => `• ${i.cantidad}x ${i.nombre} — ${formatGs(i.cantidad * i.precio_unitario)}`);
    const mensaje = [
      "Hola! Te escribo por estos productos que vi en la página:",
      "",
      ...lineas,
      "",
      `Total: ${formatGs(total)}`,
    ].join("\n");

    // Best-effort: queda registrado en el panel para que puedan revisarlo y decidir
    // si descuentan stock. Si falla (sin conexión, etc.) igual se manda el WhatsApp.
    try {
      const supabase = createClient();
      await supabase.from("pedidos_web").insert({
        items: items.map((i) => ({
          producto_id: i.producto_id,
          nombre: i.nombre,
          codigo_interno: i.codigo_interno,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        total,
      });
    } catch {
      // no bloquea el envío del pedido por WhatsApp
    }

    window.open(linkWhatsApp(numeroWhatsApp, mensaje), "_blank", "noopener,noreferrer");
    setEnviando(false);
    vaciar();
    cerrarCarrito();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Cerrar carrito"
        className="absolute inset-0 bg-ink-900/40"
        onClick={cerrarCarrito}
      />
      <div className="relative flex h-full w-full max-w-sm flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
            <ShoppingCart size={18} /> Tu carrito
          </p>
          <button onClick={cerrarCarrito} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-rose-50">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-8 text-center text-[13px] text-ink-600">Todavía no agregaste productos.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.producto_id} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-rose-50">
                    {item.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.foto} alt={item.nombre} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold leading-tight text-ink-900">{item.nombre}</p>
                    <p className="tabular mt-0.5 text-[13px] font-bold text-rose-700">
                      {formatGs(item.precio_unitario * item.cantidad)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-rose-700"
                        aria-label="Restar"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="tabular min-w-5 text-center text-[13px] font-semibold">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-rose-700"
                        aria-label="Sumar"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => quitar(item.producto_id)}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-ink-600 hover:text-alert"
                        aria-label="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink-900">Total</span>
              <span className="tabular text-[17px] font-bold text-rose-700">{formatGs(total)}</span>
            </div>
            <button
              onClick={enviarPorWhatsApp}
              disabled={enviando}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-[14.5px] font-bold text-ink-900 hover:bg-rose-700 hover:text-white disabled:opacity-60"
            >
              <MessageCircle size={16} /> Enviar pedido por WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
