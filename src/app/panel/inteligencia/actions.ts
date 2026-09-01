"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const PCT_VALIDOS = [10, 15, 20, 25];

export async function aplicarDescuento(articuloId: string, pct: number): Promise<ResultadoAccion> {
  await exigirUsuario({ soloAdmin: true });
  if (!PCT_VALIDOS.includes(pct)) return { ok: false, error: "Porcentaje inválido." };

  const supabase = await createClient();
  const { data: art } = await supabase
    .from("articulos")
    .select("precio_venta, precio_lista")
    .eq("id", articuloId)
    .maybeSingle<{ precio_venta: number; precio_lista: number | null }>();
  if (!art) return { ok: false, error: "Artículo no encontrado." };

  const lista = art.precio_lista ?? art.precio_venta;
  const nuevoPrecio = Math.round((lista * (100 - pct)) / 100);

  const { error } = await supabase
    .from("articulos")
    .update({ precio_lista: lista, descuento_pct: pct, precio_venta: nuevoPrecio })
    .eq("id", articuloId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/inteligencia");
  revalidatePath(`/panel/productos/${articuloId}`);
  return { ok: true };
}

export async function quitarDescuento(articuloId: string): Promise<ResultadoAccion> {
  await exigirUsuario({ soloAdmin: true });
  const supabase = await createClient();

  const { data: art } = await supabase
    .from("articulos")
    .select("precio_venta, precio_lista")
    .eq("id", articuloId)
    .maybeSingle<{ precio_venta: number; precio_lista: number | null }>();
  if (!art) return { ok: false, error: "Artículo no encontrado." };

  const { error } = await supabase
    .from("articulos")
    .update({
      precio_venta: art.precio_lista ?? art.precio_venta,
      precio_lista: null,
      descuento_pct: 0,
    })
    .eq("id", articuloId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/inteligencia");
  revalidatePath(`/panel/productos/${articuloId}`);
  return { ok: true };
}

export async function aplicarDescuentoGrupo(articuloIds: string[], pct: number): Promise<ResultadoAccion> {
  await exigirUsuario({ soloAdmin: true });
  for (const id of articuloIds) {
    const res = await aplicarDescuento(id, pct);
    if (!res.ok) return res;
  }
  return { ok: true };
}
