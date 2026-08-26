import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemCarrito } from "@/lib/types/database";

interface ProductoPlano {
  id: string;
  codigo_interno: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  es_a_pedido: boolean;
  deleted_at: string | null;
}

interface VariantePlana {
  id: string;
  producto_id: string;
  codigo_interno: string;
  talle: string | null;
  color: string | null;
  modelo: string | null;
  precio_venta: number | null;
  stock_actual: number;
  deleted_at: string | null;
  productos: ProductoPlano | null;
}

function itemDesdeProducto(p: ProductoPlano): Omit<ItemCarrito, "cantidad" | "descuento_item"> {
  return {
    clave: p.id,
    producto_id: p.id,
    variante_id: null,
    nombre: p.nombre,
    codigo: p.codigo_interno,
    precio_unitario: p.precio_venta,
    precio_original: p.precio_venta,
    stock_disponible: p.stock_actual,
    es_a_pedido: p.es_a_pedido,
  };
}

function itemDesdeVariante(v: VariantePlana): Omit<ItemCarrito, "cantidad" | "descuento_item"> | null {
  if (!v.productos) return null;
  const etiqueta = [v.talle, v.color, v.modelo].filter(Boolean).join(" · ");
  return {
    clave: `${v.producto_id}:${v.id}`,
    producto_id: v.producto_id,
    variante_id: v.id,
    nombre: `${v.productos.nombre} — ${etiqueta}`,
    codigo: v.codigo_interno,
    precio_unitario: v.precio_venta ?? v.productos.precio_venta,
    precio_original: v.precio_venta ?? v.productos.precio_venta,
    stock_disponible: v.stock_actual,
    es_a_pedido: v.productos.es_a_pedido,
  };
}

/** Busca por código interno (AM-0001 / AM-0001-A) o código de barras de fábrica. */
export async function buscarPorCodigo(
  supabase: SupabaseClient,
  codigo: string
): Promise<Omit<ItemCarrito, "cantidad" | "descuento_item"> | null> {
  const limpio = codigo.trim();
  if (!limpio) return null;

  const { data: variante } = await supabase
    .from("variantes")
    .select("*, productos(id, codigo_interno, nombre, precio_venta, stock_actual, es_a_pedido, deleted_at)")
    .eq("codigo_interno", limpio)
    .is("deleted_at", null)
    .maybeSingle<VariantePlana>();
  if (variante) return itemDesdeVariante(variante);

  const { data: producto } = await supabase
    .from("productos")
    .select("id, codigo_interno, nombre, precio_venta, stock_actual, es_a_pedido, deleted_at")
    .or(`codigo_interno.eq.${limpio},codigo_barras.eq.${limpio}`)
    .is("deleted_at", null)
    .maybeSingle<ProductoPlano>();
  if (producto) return itemDesdeProducto(producto);

  return null;
}

export interface ResultadoBusqueda {
  producto: ProductoPlano;
  variantes: VariantePlana[];
}

/** Búsqueda manual por nombre/código — la tercera vía que pide el brief. */
export async function buscarPorNombre(supabase: SupabaseClient, texto: string): Promise<ResultadoBusqueda[]> {
  const limpio = texto.trim();
  if (limpio.length < 2) return [];

  const { data: productos } = await supabase
    .from("productos")
    .select("id, codigo_interno, nombre, precio_venta, stock_actual, es_a_pedido, deleted_at, tiene_variantes")
    .or(`nombre.ilike.%${limpio}%,codigo_interno.ilike.%${limpio}%`)
    .is("deleted_at", null)
    .limit(8);

  if (!productos || productos.length === 0) return [];

  const conVariantes = productos.filter((p) => p.tiene_variantes);
  let variantesPorProducto = new Map<string, VariantePlana[]>();

  if (conVariantes.length > 0) {
    const { data: variantes } = await supabase
      .from("variantes")
      .select("*, productos(id, codigo_interno, nombre, precio_venta, stock_actual, es_a_pedido, deleted_at)")
      .in("producto_id", conVariantes.map((p) => p.id))
      .is("deleted_at", null);
    variantesPorProducto = new Map();
    for (const v of (variantes as VariantePlana[]) ?? []) {
      const lista = variantesPorProducto.get(v.producto_id) ?? [];
      lista.push(v);
      variantesPorProducto.set(v.producto_id, lista);
    }
  }

  return productos.map((p) => ({ producto: p as ProductoPlano, variantes: variantesPorProducto.get(p.id) ?? [] }));
}

export { itemDesdeProducto, itemDesdeVariante };
