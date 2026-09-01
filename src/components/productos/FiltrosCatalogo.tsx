"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/types/database";

/** Buscador + chips de categoría para el catálogo de artículos. */
export function FiltrosCatalogo({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function actualizar(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === "") params.delete(clave);
      else params.set(clave, valor);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const categoriaActiva = searchParams.get("categoria");

  return (
    <div className="mb-4 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          actualizar({ q });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => actualizar({ q })}
          placeholder="Buscar por nombre, código interno o código de barras..."
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
        />
      </form>

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => actualizar({ categoria: null })}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold",
              !categoriaActiva ? "border-border-strong bg-rose-600 text-ink-900" : "border-border bg-surface text-ink-600"
            )}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => actualizar({ categoria: c.slug })}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold",
                categoriaActiva === c.slug
                  ? "border-border-strong bg-rose-600 text-ink-900"
                  : "border-border bg-surface text-ink-600"
              )}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
