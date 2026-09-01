"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

const itemSchema = z.object({
  articulo_id: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
  costo_unitario: z.coerce.number().min(0),
  precio_venta_nuevo: z.coerce.number().min(0).nullable().optional(),
});

const compraSchema = z.object({
  proveedor_id: z.string().uuid("Elegí un proveedor."),
  almacen_id: z.string().uuid("Elegí un almacén."),
  condicion: z.enum(["contado", "credito"]),
  items: z.array(itemSchema).min(1, "Agregá al menos un artículo."),
});

export type CompraInput = z.infer<typeof compraSchema>;

export async function confirmarCompra(input: CompraInput): Promise<ResultadoAccion> {
  const parsed = compraSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("confirmar_compra", {
    p_proveedor_id: d.proveedor_id,
    p_almacen_id: d.almacen_id,
    p_condicion: d.condicion,
    p_items: d.items.map((i) => ({
      articulo_id: i.articulo_id,
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
      precio_venta_nuevo: i.precio_venta_nuevo ?? null,
    })),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/compras");
  revalidatePath("/panel/stock");
  revalidatePath("/panel/proveedores");
  return { ok: true, id: (data as { id: string } | null)?.id };
}

export async function anularCompra(compraId: string, motivo: string): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo la administradora puede anular una compra." };
  if (!motivo.trim()) return { ok: false, error: "Poné un motivo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("anular_compra", { p_compra_id: compraId, p_motivo: motivo.trim() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/compras");
  revalidatePath(`/panel/compras/${compraId}`);
  revalidatePath("/panel/stock");
  revalidatePath("/panel/proveedores");
  return { ok: true };
}

/** Buscador de artículos para armar la compra. */
export async function buscarArticulos(texto: string) {
  await exigirUsuario();
  const t = texto.trim();
  if (t.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("articulos")
    .select("id, nombre, codigo_interno, codigo_barras, precio_venta")
    .is("deleted_at", null)
    .or(`nombre.ilike.%${t}%,codigo_interno.ilike.%${t}%,codigo_barras.ilike.%${t}%`)
    .limit(8);
  return data ?? [];
}
