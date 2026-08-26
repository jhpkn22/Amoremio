import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/types/database";

export function ChipsCategorias({ categorias, activa }: { categorias: Categoria[]; activa?: string }) {
  return (
    <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:max-w-6xl [&::-webkit-scrollbar]:hidden">
      <Link
        href="/catalogo"
        className={cn(
          "flex min-h-9 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold",
          !activa ? "border-border-strong bg-rose-600 text-ink-900" : "border-border bg-surface text-ink-600"
        )}
      >
        Todas
      </Link>
      {categorias.map((c) => (
        <Link
          key={c.id}
          href={`/catalogo?categoria=${c.slug}`}
          className={cn(
            "flex min-h-9 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold",
            activa === c.slug ? "border-border-strong bg-rose-600 text-ink-900" : "border-border bg-surface text-ink-600"
          )}
        >
          {c.nombre}
        </Link>
      ))}
    </div>
  );
}
