import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerWhatsAppLocal } from "@/lib/vitrina/configuracion";
import { BarraBusqueda } from "@/components/vitrina/BarraBusqueda";
import { TarjetaProducto } from "@/components/vitrina/TarjetaProducto";
import type { Categoria, Producto } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Catálogo — Amore Mío",
  description: "Todos los regalos personalizados de Amore Mío: tazas, remeras, cuadros y souvenirs. Coronel Bogado, Itapúa.",
};

const TAMAÑO_PAGINA = 12;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; limite?: string; q?: string }>;
}) {
  const { categoria, limite, q } = await searchParams;
  const limiteNum = Math.min(Number(limite) || TAMAÑO_PAGINA, 96);
  const supabase = await createClient();

  const { data: categorias } = await supabase.from("categorias").select("*").eq("activa", true).is("deleted_at", null).order("orden");

  let query = supabase
    .from("productos")
    .select("*, categorias(id, nombre, slug), producto_fotos(path_original, path_thumbnail, orden)", { count: "exact" })
    .eq("visible_en_vitrina", true)
    .is("deleted_at", null)
    .order("nombre")
    .range(0, limiteNum - 1);

  if (categoria) {
    const cat = (categorias as Categoria[] | null)?.find((c) => c.slug === categoria);
    if (cat) query = query.eq("categoria_id", cat.id);
  }
  if (q?.trim()) {
    query = query.ilike("nombre", `%${q.trim()}%`);
  }

  const [{ data, count }, numeroWhatsApp] = await Promise.all([query, obtenerWhatsAppLocal(supabase)]);

  const productos = ((data ?? []) as Producto[]).map((p) => ({
    ...p,
    producto_fotos: [...(p.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden),
  }));

  const hayMas = (count ?? 0) > productos.length;

  const paramsExtra = new URLSearchParams();
  if (categoria) paramsExtra.set("categoria", categoria);
  if (q) paramsExtra.set("q", q);
  const sufijoExtra = paramsExtra.toString();

  return (
    <div>
      <div className="mx-auto max-w-3xl px-5 pt-6 lg:max-w-6xl">
        <h1 className="text-[22px] font-bold text-ink-900">Catálogo</h1>
      </div>
      <div className="py-4">
        <Suspense fallback={<div className="h-11" />}>
          <BarraBusqueda categorias={(categorias as Categoria[]) ?? []} />
        </Suspense>
      </div>
      <div className="mx-auto max-w-3xl px-5 pb-16 lg:max-w-6xl">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <PackageSearch size={32} className="text-rose-300" />
            <p className="text-[14px] font-semibold text-ink-900">
              {categoria || q ? "No encontramos productos con ese filtro" : "No hay productos todavía"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} numeroWhatsApp={numeroWhatsApp} />
              ))}
            </div>
            {hayMas && (
              <div className="mt-7 flex justify-center">
                <Link
                  href={`/catalogo?${sufijoExtra ? `${sufijoExtra}&` : ""}limite=${limiteNum + TAMAÑO_PAGINA}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Ver más
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
