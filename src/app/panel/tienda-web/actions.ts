"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

// "Tienda web" = piezas de muestra para la vitrina pública. No tienen stock
// real (se preparan a pedido); el catálogo con inventario vive en "Productos".
const productoSchema = z.object({
  nombre: z.string().min(2, "Poné un nombre para la pieza."),
  descripcion: z.string().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  proveedor: z.string().optional(),
  precio_venta: z.coerce.number().min(0, "El precio no puede ser negativo."),
  precio_costo: z.coerce.number().min(0).optional().nullable(),
  visible_en_vitrina: z.coerce.boolean().default(true),
  es_a_pedido: z.coerce.boolean().default(false),
  dias_demora: z.coerce.number().int().min(0).optional().nullable(),
  opciones_personalizacion: z.array(z.string()).default([]),
});

export type ProductoInput = z.infer<typeof productoSchema>;
export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

export async function crearProducto(input: ProductoInput): Promise<ResultadoAccion> {
  const parsed = productoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const datos = parsed.data;

  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      categoria_id: datos.categoria_id || null,
      proveedor: datos.proveedor || null,
      precio_venta: datos.precio_venta,
      visible_en_vitrina: datos.visible_en_vitrina,
      es_a_pedido: datos.es_a_pedido,
      dias_demora: datos.dias_demora || null,
      opciones_personalizacion: datos.opciones_personalizacion,
    })
    .select("id")
    .single();

  if (error || !producto) {
    return { ok: false, error: "No se pudo guardar la pieza. " + (error?.message ?? "") };
  }

  if (usuario.rol === "admin" && datos.precio_costo !== undefined && datos.precio_costo !== null) {
    await supabase
      .from("producto_costos")
      .insert({ producto_id: producto.id, precio_costo: datos.precio_costo, updated_by: usuario.id });
  }

  revalidatePath("/panel/tienda-web");
  return { ok: true, id: producto.id };
}

export async function actualizarProducto(id: string, input: Partial<ProductoInput>): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  // precio_costo se maneja aparte (tabla producto_costos).
  const { precio_costo, ...resto } = input;

  const { error } = await supabase
    .from("productos")
    .update({
      ...resto,
      descripcion: resto.descripcion || null,
      categoria_id: resto.categoria_id || null,
      proveedor: resto.proveedor || null,
      dias_demora: resto.dias_demora || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo guardar el cambio. " + error.message };

  if (usuario.rol === "admin" && precio_costo !== undefined && precio_costo !== null) {
    await supabase
      .from("producto_costos")
      .upsert({ producto_id: id, precio_costo, updated_by: usuario.id }, { onConflict: "producto_id" });
  }

  revalidatePath(`/panel/tienda-web/${id}`);
  revalidatePath("/panel/tienda-web");
  return { ok: true };
}

export async function agregarFoto(
  productoId: string,
  pathOriginal: string,
  pathThumbnail: string,
  orden: number
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase
    .from("producto_fotos")
    .insert({ producto_id: productoId, path_original: pathOriginal, path_thumbnail: pathThumbnail, orden });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/tienda-web/${productoId}`);
  revalidatePath("/panel/tienda-web");
  return { ok: true };
}

export async function eliminarFoto(fotoId: string, productoId: string): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("producto_fotos").delete().eq("id", fotoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/tienda-web/${productoId}`);
  return { ok: true };
}

export async function crearCategoria(nombre: string, slug: string): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nombre, slug });
  if (error) return { ok: false, error: "No se pudo crear la categoría. " + error.message };
  revalidatePath("/panel/tienda-web");
  return { ok: true };
}

export interface FilaCsv {
  nombre: string;
  categoria?: string;
  proveedor?: string;
  precio_venta: number;
  precio_costo?: number;
  es_a_pedido?: boolean;
}

function slugifyServidor(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function importarProductosCsv(
  filas: FilaCsv[]
): Promise<{ creados: number; errores: string[] }> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();
  const errores: string[] = [];
  let creados = 0;

  const { data: categoriasExistentes } = await supabase.from("categorias").select("id, nombre, slug");
  const mapaCategorias = new Map<string, string>(
    (categoriasExistentes ?? []).map((c) => [c.nombre.toLowerCase().trim(), c.id])
  );

  for (const [i, fila] of filas.entries()) {
    if (!fila.nombre?.trim() || !(fila.precio_venta >= 0)) {
      errores.push(`Fila ${i + 2}: falta el nombre o el precio de venta.`);
      continue;
    }

    let categoria_id: string | null = null;
    if (fila.categoria?.trim()) {
      const clave = fila.categoria.toLowerCase().trim();
      categoria_id = mapaCategorias.get(clave) ?? null;
      if (!categoria_id) {
        const slug = slugifyServidor(fila.categoria) || `categoria-${mapaCategorias.size + 1}`;
        const { data: nueva } = await supabase
          .from("categorias")
          .insert({ nombre: fila.categoria.trim(), slug })
          .select("id")
          .single();
        if (nueva) {
          categoria_id = nueva.id;
          mapaCategorias.set(clave, nueva.id);
        }
      }
    }

    const { data: producto, error } = await supabase
      .from("productos")
      .insert({
        nombre: fila.nombre.trim(),
        categoria_id,
        proveedor: fila.proveedor?.trim() || null,
        precio_venta: fila.precio_venta,
        es_a_pedido: fila.es_a_pedido ?? false,
      })
      .select("id")
      .single();

    if (error || !producto) {
      errores.push(`Fila ${i + 2} (${fila.nombre}): ${error?.message ?? "no se pudo guardar."}`);
      continue;
    }

    if (usuario.rol === "admin" && fila.precio_costo) {
      await supabase
        .from("producto_costos")
        .insert({ producto_id: producto.id, precio_costo: fila.precio_costo, updated_by: usuario.id });
    }
    creados++;
  }

  revalidatePath("/panel/tienda-web");
  return { creados, errores };
}
