import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemCarrito } from "@/lib/types/database";

type ItemNuevo = Omit<ItemCarrito, "cantidad" | "descuento_item">;

interface ArticuloPlano {
  id: string;
  codigo_interno: string;
  codigo_barras: string | null;
  nombre: string;
  precio_venta: number;
  deleted_at: string | null;
  articulo_stock: { almacen_id: string; cantidad: number }[] | null;
}

function stockEn(a: ArticuloPlano, almacenId: string): number {
  return (a.articulo_stock ?? []).find((s) => s.almacen_id === almacenId)?.cantidad ?? 0;
}

function itemDesdeArticulo(a: ArticuloPlano, almacenId: string): ItemNuevo {
  return {
    clave: a.id,
    articulo_id: a.id,
    nombre: a.nombre,
    codigo: a.codigo_barras ?? a.codigo_interno,
    precio_unitario: a.precio_venta,
    precio_original: a.precio_venta,
    stock_disponible: stockEn(a, almacenId),
  };
}

const SELECT = "id, codigo_interno, codigo_barras, nombre, precio_venta, deleted_at, articulo_stock(almacen_id, cantidad)";

/** Busca un artículo por código de barras o código interno (ART-0001). */
export async function buscarPorCodigo(
  supabase: SupabaseClient,
  codigo: string,
  almacenId: string
): Promise<ItemNuevo | null> {
  const limpio = codigo.trim();
  if (!limpio) return null;

  const { data } = await supabase
    .from("articulos")
    .select(SELECT)
    .or(`codigo_barras.eq.${limpio},codigo_interno.eq.${limpio}`)
    .is("deleted_at", null)
    .maybeSingle<ArticuloPlano>();

  return data ? itemDesdeArticulo(data, almacenId) : null;
}

export interface ResultadoBusqueda {
  id: string;
  nombre: string;
  codigo_interno: string;
  precio_venta: number;
  stock: number;
}

/** Búsqueda manual por nombre o código. */
export async function buscarPorNombre(
  supabase: SupabaseClient,
  texto: string,
  almacenId: string
): Promise<ResultadoBusqueda[]> {
  const limpio = texto.trim();
  if (limpio.length < 2) return [];

  const { data } = await supabase
    .from("articulos")
    .select(SELECT)
    .or(`nombre.ilike.%${limpio}%,codigo_interno.ilike.%${limpio}%,codigo_barras.ilike.%${limpio}%`)
    .is("deleted_at", null)
    .limit(8)
    .returns<ArticuloPlano[]>();

  return (data ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    codigo_interno: a.codigo_interno,
    precio_venta: a.precio_venta,
    stock: stockEn(a, almacenId),
  }));
}

/** Arma un ItemCarrito a partir de un resultado de búsqueda manual. */
export function itemDesdeResultado(r: ResultadoBusqueda): ItemNuevo {
  return {
    clave: r.id,
    articulo_id: r.id,
    nombre: r.nombre,
    codigo: r.codigo_interno,
    precio_unitario: r.precio_venta,
    precio_original: r.precio_venta,
    stock_disponible: r.stock,
  };
}
