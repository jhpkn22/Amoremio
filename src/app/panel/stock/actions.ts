"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

const almacenSchema = z.object({
  nombre: z.string().min(2, "Poné un nombre para el almacén."),
  direccion: z.string().trim().optional().nullable(),
  es_principal: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export async function crearAlmacen(input: z.infer<typeof almacenSchema>): Promise<ResultadoAccion> {
  const parsed = almacenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();

  if (d.es_principal) {
    await supabase.from("almacenes").update({ es_principal: false }).eq("es_principal", true);
  }

  const { data, error } = await supabase
    .from("almacenes")
    .insert({ nombre: d.nombre, direccion: d.direccion || null, es_principal: d.es_principal ?? false })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el almacén. " + (error?.message ?? "") };
  revalidatePath("/panel/stock/almacenes");
  revalidatePath("/panel/stock");
  return { ok: true, id: data.id };
}

export async function actualizarAlmacen(
  id: string,
  input: z.infer<typeof almacenSchema>
): Promise<ResultadoAccion> {
  const parsed = almacenSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();

  if (d.es_principal) {
    await supabase.from("almacenes").update({ es_principal: false }).eq("es_principal", true).neq("id", id);
  }

  const { error } = await supabase
    .from("almacenes")
    .update({
      ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
      direccion: d.direccion || null,
      ...(d.es_principal !== undefined ? { es_principal: d.es_principal } : {}),
      ...(d.activo !== undefined ? { activo: d.activo } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el cambio. " + error.message };
  revalidatePath("/panel/stock/almacenes");
  revalidatePath("/panel/stock");
  return { ok: true };
}

export async function ajustarStock(
  articuloId: string,
  almacenId: string,
  cantidad: number,
  motivo: string
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.rpc("ajustar_stock", {
    p_articulo_id: articuloId,
    p_almacen_id: almacenId,
    p_cantidad: cantidad,
    p_motivo: motivo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/stock");
  return { ok: true };
}

export async function transferirStock(
  articuloId: string,
  almacenOrigen: string,
  almacenDestino: string,
  cantidad: number
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.rpc("transferir_stock", {
    p_articulo_id: articuloId,
    p_almacen_origen: almacenOrigen,
    p_almacen_destino: almacenDestino,
    p_cantidad: cantidad,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/stock");
  return { ok: true };
}
