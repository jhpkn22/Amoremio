import { Plus, PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { FiltrosCatalogo } from "@/components/productos/FiltrosCatalogo";
import { ArticuloRow } from "@/components/productos/ArticuloRow";
import { Button } from "@/components/ui/Button";
import type { Articulo, Categoria } from "@/lib/types/database";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  await exigirUsuario();
  const { q, categoria } = await searchParams;
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .is("deleted_at", null)
    .order("orden");

  let query = supabase
    .from("articulos")
    .select("*, categorias(id, nombre, slug)")
    .is("deleted_at", null)
    .order("nombre");

  if (q) {
    query = query.or(
      `nombre.ilike.%${q}%,codigo_interno.ilike.%${q}%,codigo_barras.ilike.%${q}%`
    );
  }
  if (categoria) {
    const cat = (categorias as Categoria[] | null)?.find((c) => c.slug === categoria);
    if (cat) query = query.eq("categoria_id", cat.id);
  }

  const { data, error } = await query;
  const articulos = (data ?? []) as Articulo[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Productos</h1>
          <p className="text-[13px] text-ink-600">
            {articulos.length} artículo{articulos.length === 1 ? "" : "s"} en el catálogo
          </p>
        </div>
        <Button href="/panel/productos/nuevo">
          <Plus size={18} /> Nuevo
        </Button>
      </div>

      <FiltrosCatalogo categorias={(categorias as Categoria[]) ?? []} />

      {error && (
        <p className="rounded-xl border border-alert bg-alert-soft p-4 text-[14px] text-alert">
          No se pudo cargar el catálogo. {error.message}
        </p>
      )}

      {!error && articulos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageSearch size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Todavía no hay artículos</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Creá acá cada producto del catálogo. Después ingresan al stock por la pestaña Compras.
          </p>
          <Button href="/panel/productos/nuevo" className="mt-1">
            <Plus size={18} /> Crear artículo
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {articulos.map((a) => (
          <ArticuloRow key={a.id} articulo={a} />
        ))}
      </div>
    </div>
  );
}
