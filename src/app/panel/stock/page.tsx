import { Plus, Upload, PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FiltrosStock } from "@/components/stock/FiltrosStock";
import { ProductoRow } from "@/components/stock/ProductoRow";
import { Button } from "@/components/ui/Button";
import type { Categoria, Producto } from "@/lib/types/database";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; alerta?: string }>;
}) {
  const { q, categoria, alerta } = await searchParams;
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

  if (alerta === "1") {
    productos = productos.filter((p) => p.stock_actual <= p.stock_minimo);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Stock</h1>
          <p className="text-[13px] text-ink-600">{productos.length} producto{productos.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button href="/panel/stock/importar" variante="fantasma" className="hidden sm:inline-flex">
            <Upload size={16} /> Importar
          </Button>
          <Button href="/panel/stock/nuevo">
            <Plus size={18} /> Nuevo
          </Button>
        </div>
      </div>

      <FiltrosStock categorias={(categorias as Categoria[]) ?? []} />

      {error && (
        <p className="rounded-xl border border-alert bg-alert-soft p-4 text-[14px] text-alert">
          No se pudo cargar el stock. Revisá tu conexión e intentá de nuevo.
        </p>
      )}

      {!error && productos.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageSearch size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">No encontramos productos con esos filtros</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Probá con otra búsqueda, o cargá tu primer producto para empezar a armar el catálogo.
          </p>
          <Button href="/panel/stock/nuevo" className="mt-1">
            <Plus size={18} /> Cargar producto
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
