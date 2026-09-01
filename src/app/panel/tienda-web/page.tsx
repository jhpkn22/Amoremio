import { Plus, Upload, PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FiltrosStock } from "@/components/tienda-web/FiltrosStock";
import { ProductoRow } from "@/components/tienda-web/ProductoRow";
import { Button } from "@/components/ui/Button";
import type { Categoria, Producto } from "@/lib/types/database";

export default async function TiendaWebPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .is("deleted_at", null)
    .order("orden");

  let query = supabase
    .from("productos")
    .select("*, categorias(id, nombre, slug), producto_fotos(path_original, path_thumbnail, orden)")
    .is("deleted_at", null)
    .order("nombre");

  if (q) query = query.or(`nombre.ilike.%${q}%,codigo_interno.ilike.%${q}%`);
  if (categoria) {
    const cat = (categorias as Categoria[] | null)?.find((c) => c.slug === categoria);
    if (cat) query = query.eq("categoria_id", cat.id);
  }

  const { data, error } = await query;
  let productos = (data ?? []) as Producto[];

  // ordenar la única foto (o ninguna) al frente por su campo "orden"
  productos = productos.map((p) => ({
    ...p,
    producto_fotos: [...(p.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Tienda web</h1>
          <p className="text-[13px] text-ink-600">
            {productos.length} pieza{productos.length === 1 ? "" : "s"} de muestra para la vitrina · se preparan a pedido
          </p>
        </div>
        <div className="flex gap-2">
          <Button href="/panel/tienda-web/importar" variante="fantasma" className="hidden sm:inline-flex">
            <Upload size={16} /> Importar
          </Button>
          <Button href="/panel/tienda-web/nuevo">
            <Plus size={18} /> Nueva
          </Button>
        </div>
      </div>

      <FiltrosStock categorias={(categorias as Categoria[]) ?? []} />

      {error && (
        <p className="rounded-xl border border-alert bg-alert-soft p-4 text-[14px] text-alert">
          No se pudo cargar la tienda web. Revisá tu conexión e intentá de nuevo.
        </p>
      )}

      {!error && productos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageSearch size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">No encontramos piezas con esos filtros</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Probá con otra búsqueda, o cargá tu primera pieza de muestra para armar la vitrina.
          </p>
          <Button href="/panel/tienda-web/nuevo" className="mt-1">
            <Plus size={18} /> Cargar pieza
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {productos.map((p) => (
          <ProductoRow key={p.id} producto={p} />
        ))}
      </div>
    </div>
  );
}
