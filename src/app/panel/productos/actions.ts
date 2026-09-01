"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import type { Articulo } from "@/lib/types/database";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

const crearSchema = z
  .object({
    nombre: z.string().min(2, "Poné un nombre para el artículo."),
    categoria_id: z.string().uuid().nullable().optional(),
    precio_venta: z.coerce.number().min(0, "El precio de venta es obligatorio."),
    precio_costo: z.coerce.number().min(0).optional().nullable(),
    stock_minimo: z.coerce.number().int().min(0).default(0),
    codigo_barras: z.string().trim().optional().nullable(),
    // el usuario marcó explícitamente "no tiene código de barras"
    sin_codigo: z.boolean().default(false),
  })
  .refine((d) => (d.codigo_barras && d.codigo_barras.length > 0) || d.sin_codigo, {
    message: 'Escaneá el código de barras o marcá «No tiene código de barras».',
    path: ["codigo_barras"],
  });

export type CrearArticuloInput = z.infer<typeof crearSchema>;

export async function crearArticulo(input: CrearArticuloInput): Promise<ResultadoAccion> {
  const parsed = crearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const codigo = d.codigo_barras?.trim() || null;

  if (codigo) {
    const { data: choque } = await supabase
      .from("articulos")
      .select("id")
      .eq("codigo_barras", codigo)
      .maybeSingle();
    if (choque) return { ok: false, error: "Ese código de barras ya está cargado en otro artículo." };
  }

  const { data: articulo, error } = await supabase
    .from("articulos")
    .insert({
      nombre: d.nombre,
      categoria_id: d.categoria_id || null,
      precio_venta: d.precio_venta,
      stock_minimo: d.stock_minimo,
      codigo_barras: codigo,
      codigo_barras_origen: codigo ? "fabrica" : "sin_codigo",
    })
    .select("id")
    .single();

  if (error || !articulo) {
    return { ok: false, error: "No se pudo guardar el artículo. " + (error?.message ?? "") };
  }

  if (usuario.rol === "admin" && d.precio_costo !== undefined && d.precio_costo !== null) {
    await supabase
      .from("articulo_costos")
      .insert({ articulo_id: articulo.id, precio_costo: d.precio_costo, updated_by: usuario.id });
  }

  revalidatePath("/panel/productos");
  return { ok: true, id: articulo.id };
}

const editarSchema = z.object({
  nombre: z.string().min(2).optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  precio_venta: z.coerce.number().min(0).optional(),
  precio_costo: z.coerce.number().min(0).optional().nullable(),
  stock_minimo: z.coerce.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

export async function actualizarArticulo(
  id: string,
  input: z.infer<typeof editarSchema>
): Promise<ResultadoAccion> {
  const parsed = editarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { precio_costo, ...resto } = parsed.data;

  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  if (Object.keys(resto).length > 0) {
    const { error } = await supabase
      .from("articulos")
      .update({ ...resto, categoria_id: resto.categoria_id ?? null })
      .eq("id", id);
    if (error) return { ok: false, error: "No se pudo guardar el cambio. " + error.message };
  }

  if (usuario.rol === "admin" && precio_costo !== undefined && precio_costo !== null) {
    await supabase
      .from("articulo_costos")
      .upsert({ articulo_id: id, precio_costo, updated_by: usuario.id }, { onConflict: "articulo_id" });
  }

  revalidatePath(`/panel/productos/${id}`);
  revalidatePath("/panel/productos");
  return { ok: true };
}

// ---- ciclo de vida del código de barras (vía RPC SECURITY DEFINER) ----

async function rpcCodigo(
  fn: "generar_codigo_barras_articulo" | "asignar_codigo_barras_articulo" | "marcar_codigo_impreso_articulo",
  id: string,
  extra?: Record<string, unknown>
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_articulo_id: id, ...extra });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/productos/${id}`);
  revalidatePath("/panel/productos");
  return { ok: true };
}

export async function generarCodigoBarras(id: string) {
  return rpcCodigo("generar_codigo_barras_articulo", id);
}

export async function asignarCodigoBarras(id: string, codigo: string) {
  return rpcCodigo("asignar_codigo_barras_articulo", id, { p_codigo: codigo });
}

export async function marcarCodigoImpreso(id: string) {
  return rpcCodigo("marcar_codigo_impreso_articulo", id);
}

export async function cargarArticulo(id: string): Promise<Articulo | null> {
  await exigirUsuario();
  const supabase = await createClient();
  const { data } = await supabase
    .from("articulos")
    .select("*, categorias(id, nombre, slug), articulo_costos(precio_costo)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Articulo | null) ?? null;
}
