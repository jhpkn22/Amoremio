"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Search, X } from "lucide-react";
import { buscarPorNombre, itemDesdeResultado, type ResultadoBusqueda } from "@/lib/caja/buscar";
import type { ItemCarrito } from "@/lib/types/database";
import { formatGs } from "@/lib/utils";

/** Búsqueda manual por nombre o código, para cuando no hay etiqueta a mano. */
export function BusquedaManual({
  supabase,
  almacenId,
  onSeleccionar,
}: {
  supabase: SupabaseClient;
  almacenId: string;
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
    timeoutRef.current = setTimeout(async () => {
      if (texto.trim().length < 2) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      const r = await buscarPorNombre(supabase, texto, almacenId);
      setResultados(r);
      setBuscando(false);
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [texto, supabase, almacenId]);

  function elegir(r: ResultadoBusqueda) {
    onSeleccionar(itemDesdeResultado(r));
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
            <p className="p-3 text-[13px] text-ink-600">No encontramos artículos con &quot;{texto}&quot;.</p>
          )}
          {!buscando &&
            resultados.map((r) => (
              <button
                key={r.id}
                onClick={() => elegir(r)}
                className="flex w-full items-center justify-between gap-2 border-b border-border p-3 text-left last:border-0 hover:bg-rose-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink-900">{r.nombre}</span>
                  <span className="block font-mono text-[12px] text-ink-600">
                    {r.codigo_interno} · stock {r.stock}
                  </span>
                </span>
                <span className="tabular whitespace-nowrap text-[14px] font-bold text-ink-900">
                  {formatGs(r.precio_venta)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
