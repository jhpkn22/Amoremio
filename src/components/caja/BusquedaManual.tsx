"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Search, X } from "lucide-react";
import { buscarPorNombre, itemDesdeProducto, itemDesdeVariante, type ResultadoBusqueda } from "@/lib/caja/buscar";
import type { ItemCarrito } from "@/lib/types/database";
import { formatGs, cn } from "@/lib/utils";

/** Tercera vía que pide el brief: búsqueda manual por nombre o código, para cuando no hay etiqueta a mano. */
export function BusquedaManual({
  supabase,
  onSeleccionar,
}: {
  supabase: SupabaseClient;
  onSeleccionar: (item: Omit<ItemCarrito, "cantidad" | "descuento_item">) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClicFuera(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("click", alHacerClicFuera);
    return () => document.removeEventListener("click", alHacerClicFuera);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // todo el setState queda adentro del setTimeout (incluso el "vaciar"
    // por texto corto) para no disparar setState de forma síncrona en
    // el cuerpo del efecto.
    timeoutRef.current = setTimeout(async () => {
      if (texto.trim().length < 2) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      const r = await buscarPorNombre(supabase, texto);
      setResultados(r);
      setBuscando(false);
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [texto, supabase]);

  function elegir(item: Omit<ItemCarrito, "cantidad" | "descuento_item"> | null) {
    if (!item) return;
    onSeleccionar(item);
    setTexto("");
    setResultados([]);
    setAbierto(false);
  }

  return (
    <div className="relative" data-mantiene-foco ref={raizRef}>
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar por nombre o código…"
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-[14px] text-ink-900 placeholder:text-ink-600/60 focus:border-border-strong focus:outline-none"
        />
        {texto && (
          <button
            onClick={() => {
              setTexto("");
              setResultados([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-600 hover:bg-rose-50"
            aria-label="Limpiar búsqueda"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {abierto && texto.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
          {buscando && <p className="p-3 text-[13px] text-ink-600">Buscando…</p>}
          {!buscando && resultados.length === 0 && (
            <p className="p-3 text-[13px] text-ink-600">No encontramos productos con &quot;{texto}&quot;.</p>
          )}
          {!buscando &&
            resultados.map(({ producto, variantes }) => (
              <div key={producto.id} className="border-b border-border last:border-0">
                {variantes.length === 0 ? (
                  <button
                    onClick={() => elegir(itemDesdeProducto(producto))}
                    disabled={producto.stock_actual <= 0 && !producto.es_a_pedido}
                    className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-rose-50 disabled:opacity-40"
                  >
                    <span>
                      <span className="block text-[14px] font-semibold text-ink-900">{producto.nombre}</span>
                      <span className="block font-mono text-[12px] text-ink-600">
                        {producto.codigo_interno} · stock {producto.stock_actual}
                      </span>
                    </span>
                    <span className="tabular whitespace-nowrap text-[14px] font-bold text-ink-900">
                      {formatGs(producto.precio_venta)}
                    </span>
                  </button>
                ) : (
                  <div className="p-3">
                    <p className="mb-2 text-[14px] font-semibold text-ink-900">{producto.nombre}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {variantes.map((v) => {
                        const etiqueta = [v.talle, v.color, v.modelo].filter(Boolean).join(" · ") || v.codigo_interno;
                        const sinStock = v.stock_actual <= 0 && !producto.es_a_pedido;
                        return (
                          <button
                            key={v.id}
                            onClick={() => elegir(itemDesdeVariante(v))}
                            disabled={sinStock}
                            className={cn(
                              "rounded-full border border-border-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-900 hover:bg-rose-50",
                              sinStock && "opacity-40"
                            )}
                          >
                            {etiqueta} · {v.stock_actual}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
