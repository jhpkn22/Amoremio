"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { linkWhatsApp } from "@/lib/whatsapp";
import { cn, formatGs } from "@/lib/utils";
import type { Variante } from "@/lib/types/database";

/** Selector de variante (si aplica) + botón único de contacto — el mensaje prellenado cambia según lo elegido. */
export function ConsultarWhatsApp({
  numeroWhatsApp,
  nombreProducto,
  codigoProducto,
  precioBase,
  variantes,
}: {
  numeroWhatsApp: string;
  nombreProducto: string;
  codigoProducto: string;
  precioBase: number;
  variantes: Variante[];
}) {
  const [varianteId, setVarianteId] = useState<string | null>(variantes[0]?.id ?? null);
  const variante = variantes.find((v) => v.id === varianteId);
  const etiquetaVariante = variante ? [variante.talle, variante.color, variante.modelo].filter(Boolean).join(" · ") : null;
  const precioVariante = variante?.precio_venta;

  const mensaje = `Hola! Te escribo por "${nombreProducto}" (${variante?.codigo_interno ?? codigoProducto})${
    etiquetaVariante ? ` — ${etiquetaVariante}` : ""
  } que vi en la página. ¿Me contás más?`;

  return (
    <div>
      {variantes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {variantes.map((v) => {
            const etiqueta = [v.talle, v.color, v.modelo].filter(Boolean).join(" · ") || v.codigo_interno;
            return (
              <button
                key={v.id}
                onClick={() => setVarianteId(v.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold",
                  varianteId === v.id ? "border-border-strong bg-rose-600 text-ink-900" : "border-border text-ink-600"
                )}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
      )}
      {precioVariante != null && precioVariante !== precioBase && (
        <p className="tabular mb-3 text-[15px] font-bold text-rose-700">{formatGs(precioVariante)}</p>
      )}
      <a
        href={linkWhatsApp(numeroWhatsApp, mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 text-[15px] font-bold text-white hover:opacity-90"
      >
        <MessageCircle size={18} /> Consultar por WhatsApp
      </a>
    </div>
  );
}
