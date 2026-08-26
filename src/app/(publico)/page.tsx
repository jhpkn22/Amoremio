import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { obtenerWhatsAppLocal } from "@/lib/vitrina/configuracion";
import { BarraBusqueda } from "@/components/vitrina/BarraBusqueda";
import { TarjetaProducto } from "@/components/vitrina/TarjetaProducto";
import { HeroRotator } from "@/components/vitrina/HeroRotator";
import { urlFotoProducto } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { Categoria, Producto } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Amore Mío — Regalos personalizados en Coronel Bogado, Itapúa",
  description:
    "Tazas, remeras, cuadros y souvenirs personalizados en Coronel Bogado, Itapúa. Consultá por WhatsApp y coordiná tu pedido.",
};

const TAMAÑO_PAGINA = 8;

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ limite?: string; categoria?: string; q?: string }>;
}) {
  const { limite, categoria, q } = await searchParams;
  const limiteNum = Math.min(Number(limite) || TAMAÑO_PAGINA, 96);
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("activa", true)
    .is("deleted_at", null)
    .order("orden");

  let query = supabase
    .from("productos")
    .select("*, producto_fotos(path_original, path_thumbnail, orden)", { count: "exact" })
    .eq("visible_en_vitrina", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(0, limiteNum - 1);

  if (categoria) {
    const cat = (categorias as Categoria[] | null)?.find((c) => c.slug === categoria);
    if (cat) query = query.eq("categoria_id", cat.id);
  }
  if (q?.trim()) {
    query = query.ilike("nombre", `%${q.trim()}%`);
  }

  const [{ data: productos, count }, numeroWhatsApp] = await Promise.all([query, obtenerWhatsAppLocal(supabase)]);

  const destacados = ((productos ?? []) as Producto[]).map((p) => ({
    ...p,
    producto_fotos: [...(p.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden),
  }));

  const hayMas = (count ?? 0) > destacados.length;

  const fotosHero = destacados
    .map((p) => p.producto_fotos?.[0])
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .slice(0, 6)
    .map((f) => urlFotoProducto(f.path_original));

  const tieneHero = fotosHero.length > 0;

  const paramsExtra = new URLSearchParams();
  if (categoria) paramsExtra.set("categoria", categoria);
  if (q) paramsExtra.set("q", q);
  const sufijoExtra = paramsExtra.toString();

  return (
    <div>
      <section
        className={cn(
          "relative flex min-h-[65vh] flex-col items-start justify-end overflow-hidden border-b border-border px-5 pb-10 pt-16 sm:min-h-[58vh]",
          !tieneHero && "bg-[linear-gradient(180deg,var(--color-rose-50),var(--color-bg)_140%)]"
        )}
      >
        {tieneHero && <HeroRotator fotos={fotosHero} />}
        {tieneHero && <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/15 to-transparent" />}
        <div className="relative mx-auto w-full max-w-3xl lg:max-w-6xl">
          <p
            className={cn("font-display text-[52px] leading-none sm:text-[68px]", tieneHero ? "text-white" : "text-rose-700")}
          >
            Amore Mío
          </p>
          <p className={cn("mt-3 max-w-sm text-[16px] font-medium", tieneHero ? "text-white/90" : "text-ink-600")}>
            Regalos que se sienten personales
          </p>
          <Link
            href="/ofertas"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-rose-700 px-6 text-[14.5px] font-bold text-white hover:opacity-90"
          >
            Ofertas
          </Link>
        </div>
      </section>

      <section className="py-5">
        <Suspense fallback={<div className="h-11" />}>
          <BarraBusqueda categorias={(categorias as Categoria[]) ?? []} />
        </Suspense>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16 lg:max-w-6xl">
        {destacados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-[14px] font-semibold text-ink-900">
              {categoria || q ? "No encontramos productos con ese filtro" : "Todavía no hay productos publicados"}
            </p>
            <p className="max-w-xs text-[13px] text-ink-600">
              {categoria || q ? "Probá con otra categoría o búsqueda." : "Volvé pronto — estamos cargando el catálogo."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {destacados.map((p) => (
                <TarjetaProducto key={p.id} producto={p} numeroWhatsApp={numeroWhatsApp} />
              ))}
            </div>
            <div className="mt-7 flex justify-center">
              {hayMas ? (
                <Link
                  href={`/?limite=${limiteNum + TAMAÑO_PAGINA}${sufijoExtra ? `&${sufijoExtra}` : ""}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Ver más
                </Link>
              ) : (
                <Link
                  href={`/catalogo${sufijoExtra ? `?${sufijoExtra}` : ""}`}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Ver catálogo completo →
                </Link>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
