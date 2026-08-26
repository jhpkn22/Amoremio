"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/types/database";

export function BarraBusqueda({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoriaActiva = searchParams.get("categoria") ?? undefined;
  const qActual = searchParams.get("q") ?? "";

  const [texto, setTexto] = useState(qActual);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // si cambia la navegación (por ej. se limpió el filtro desde otro lado), sincronizamos el input
  useEffect(() => setTexto(qActual), [qActual]);

  function navegar(cambios: { categoria?: string | null; q?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("limite"); // una búsqueda o cambio de categoría reinicia la paginación

    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) params.set(clave, valor);
      else params.delete(clave);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // debounce simple: navega 400ms después de que la persona deja de tipear
  useEffect(() => {
    const id = setTimeout(() => {
      if (texto !== qActual) navegar({ q: texto || null });
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="relative mx-auto flex max-w-3xl items-center gap-2 px-5 lg:max-w-6xl">
      <button
        type="button"
        onClick={() => setDrawerAbierto(true)}
        aria-label="Ver categorías"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-strong text-rose-700"
      >
        <Menu size={20} />
      </button>

      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navegar({ q: texto || null });
          }}
          placeholder="Buscar productos..."
          // text-[16px] (no 14px): en iOS Safari, un input con font-size menor a 16px
          // hace zoom automático de toda la página al enfocarlo. Con 16px no lo dispara.
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[16px] text-ink-900 placeholder:text-ink-600 focus:border-border-strong focus:outline-none"
        />
      </div>

      {drawerAbierto && (
        <div className="fixed inset-0 z-50 flex">
          <button aria-label="Cerrar categorías" className="absolute inset-0 bg-ink-900/40" onClick={() => setDrawerAbierto(false)} />
          <div className="relative flex h-full w-full max-w-xs flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-[16px] font-bold text-ink-900">Categorías</p>
              <button onClick={() => setDrawerAbierto(false)} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-rose-50">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto p-3">
              <button
                onClick={() => {
                  navegar({ categoria: null });
                  setDrawerAbierto(false);
                }}
                className={cn(
                  "rounded-xl px-4 py-3 text-left text-[14px] font-semibold",
                  !categoriaActiva ? "bg-rose-100 text-rose-700" : "text-ink-900 hover:bg-rose-50"
                )}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    navegar({ categoria: c.slug });
                    setDrawerAbierto(false);
                  }}
                  className={cn(
                    "rounded-xl px-4 py-3 text-left text-[14px] font-semibold",
                    categoriaActiva === c.slug ? "bg-rose-100 text-rose-700" : "text-ink-900 hover:bg-rose-50"
                  )}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
