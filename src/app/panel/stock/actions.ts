"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

const productoSchema = z.object({
  nombre: z.string().min(2, "Poné un nombre para el producto."),
  descripcion: z.string().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  proveedor: z.string().optional(),
  precio_venta: z.coerce.number().min(0, "El precio no puede ser negativo."),
  precio_costo: z.coerce.number().min(0).optional().nullable(),
  stock_inicial: z.coerce.number().int().min(0).default(0),
  stock_minimo: z.coerce.number().int().min(0).default(0),
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
      stock_minimo: datos.stock_minimo,
      visible_en_vitrina: datos.visible_en_vitrina,
      es_a_pedido: datos.es_a_pedido,
      dias_demora: datos.dias_demora || null,
      opciones_personalizacion: datos.opciones_personalizacion,
    })
    .select("id")
    .single();

  if (error || !producto) {
    return { ok: false, error: "No se pudo guardar el producto. " + (error?.message ?? "") };
  }

  if (usuario.rol === "admin" && datos.precio_costo !== undefined && datos.precio_costo !== null) {
    await supabase
      .from("producto_costos")
      .insert({ producto_id: producto.id, precio_costo: datos.precio_costo, updated_by: usuario.id });
  }

  if (datos.stock_inicial > 0) {
    await supabase.from("movimientos_stock").insert({
      producto_id: producto.id,
      tipo: "entrada",
      cantidad: datos.stock_inicial,
      motivo: "Carga inicial",
      usuario_id: usuario.id,
    });
  }

  revalidatePath("/panel/stock");
  return { ok: true, id: producto.id };
}

export async function actualizarProducto(id: string, input: Partial<ProductoInput>): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  // precio_costo se maneja aparte (tabla producto_costos); stock_inicial
  // solo tiene sentido al crear — para editar el stock existe el
  // formulario de movimientos, así que acá se descarta a propósito.
  const { precio_costo, stock_inicial: _stockInicialIgnorado, ...resto } = input;
  void _stockInicialIgnorado;

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

  revalidatePath(`/panel/stock/${id}`);
  revalidatePath("/panel/stock");
  return { ok: true };
}

const movimientoSchema = z.object({
  producto_id: z.string().uuid(),
  variante_id: z.string().uuid().nullable().optional(),
  tipo: z.enum(["entrada", "salida", "ajuste", "devolucion"]),
  cantidad: z.coerce.number().int().refine((n) => n !== 0, "La cantidad no puede ser 0."),
  motivo: z.string().optional(),
});

export async function registrarMovimiento(input: z.infer<typeof movimientoSchema>): Promise<ResultadoAccion> {
  const parsed = movimientoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const datos = parsed.data;

  if (datos.tipo === "ajuste" && !datos.motivo?.trim()) {
    return { ok: false, error: "Un ajuste manual necesita un motivo." };
  }

  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  // el signo del delta lo decide el tipo: entrada/devolución suman, salida/ajuste negativo restan.
  // acá dejamos que quien carga el ajuste ponga el signo directo en "cantidad" para no adivinar intención.
  const cantidad = datos.tipo === "salida" ? -Math.abs(datos.cantidad) : datos.cantidad;

  const { error } = await supabase.from("movimientos_stock").insert({
    producto_id: datos.producto_id,
    variante_id: datos.variante_id || null,
    tipo: datos.tipo,
    cantidad,
    motivo: datos.motivo || null,
    usuario_id: usuario.id,
  });

  if (error) return { ok: false, error: "No se pudo registrar el movimiento. " + error.message };

  revalidatePath(`/panel/stock/${datos.producto_id}`);
  revalidatePath("/panel/stock");
  return { ok: true };
}

const varianteSchema = z.object({
  producto_id: z.string().uuid(),
  talle: z.string().optional(),
  color: z.string().optional(),
  modelo: z.string().optional(),
  stock_inicial: z.coerce.number().int().min(0).default(0),
  stock_minimo: z.coerce.number().int().min(0).default(0),
  precio_venta: z.coerce.number().min(0).optional().nullable(),
});

export async function crearVariante(input: z.infer<typeof varianteSchema>): Promise<ResultadoAccion> {
  const parsed = varianteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const datos = parsed.data;

  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: variante, error } = await supabase
    .from("variantes")
    .insert({
      producto_id: datos.producto_id,
      talle: datos.talle || null,
      color: datos.color || null,
      modelo: datos.modelo || null,
      stock_minimo: datos.stock_minimo,
      precio_venta: datos.precio_venta || null,
    })
    .select("id")
    .single();

  if (error || !variante) return { ok: false, error: "No se pudo crear la variante. " + (error?.message ?? "") };

  if (datos.stock_inicial > 0) {
    await supabase.from("movimientos_stock").insert({
      producto_id: datos.producto_id,
      variante_id: variante.id,
      tipo: "entrada",
      cantidad: datos.stock_inicial,
      motivo: "Carga inicial de variante",
      usuario_id: usuario.id,
    });
  }

  // si el producto no tenía marcado que tiene variantes, lo marcamos
  await supabase.from("productos").update({ tiene_variantes: true }).eq("id", datos.producto_id);

  revalidatePath(`/panel/stock/${datos.producto_id}`);
  return { ok: true, id: variante.id };
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
  revalidatePath(`/panel/stock/${productoId}`);
  revalidatePath("/panel/stock");
  return { ok: true };
}

export async function eliminarFoto(fotoId: string, productoId: string): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("producto_fotos").delete().eq("id", fotoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/stock/${productoId}`);
  return { ok: true };
}

export async function crearCategoria(nombre: string, slug: string): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nombre, slug });
  if (error) return { ok: false, error: "No se pudo crear la categoría. " + error.message };
  revalidatePath("/panel/stock");
  return { ok: true };
}

export interface FilaCsv {
  nombre: string;
  categoria?: string;
  proveedor?: string;
  precio_venta: number;
  precio_costo?: number;
  stock_inicial?: number;
  stock_minimo?: number;
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
        stock_minimo: fila.stock_minimo ?? 0,
        es_a_pedido: fila.es_a_pedido ?? false,
      })
      .select("id")
      .single();

    if (error || !producto) {
      errores.push(`Fila ${i + 2} (${fila.nombre}): ${error?.message ?? "no se pudo guardar."}`);
      continue;
    }

    if (usuario.rol === "admin" && fila.precio_costo) {
      await supabase.from("producto_costos").insert({ producto_id: producto.id, precio_costo: fila.precio_costo, updated_by: usuario.id });
    }
    if (fila.stock_inicial && fila.stock_inicial > 0) {
      await supabase.from("movimientos_stock").insert({
        producto_id: producto.id,
        tipo: "entrada",
        cantidad: fila.stock_inicial,
        motivo: "Importación inicial (CSV)",
        usuario_id: usuario.id,
      });
    }
    creados++;
  }

  revalidatePath("/panel/stock");
  return { creados, errores };
}
