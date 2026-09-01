"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

const proveedorSchema = z.object({
  nombre: z.string().min(2, "Poné el nombre del proveedor."),
  ruc: z.string().trim().optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  descripcion: z.string().trim().optional().nullable(),
  activo: z.boolean().optional(),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;

export async function crearProveedor(input: ProveedorInput): Promise<ResultadoAccion> {
  const parsed = proveedorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: d.nombre,
      ruc: d.ruc || null,
      telefono: d.telefono || null,
      descripcion: d.descripcion || null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "No se pudo crear el proveedor. " + (error?.message ?? "") };
  revalidatePath("/panel/proveedores");
  return { ok: true, id: data.id };
}

export async function actualizarProveedor(id: string, input: ProveedorInput): Promise<ResultadoAccion> {
  const parsed = proveedorSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("proveedores")
    .update({
      ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
      ruc: d.ruc || null,
      telefono: d.telefono || null,
      descripcion: d.descripcion || null,
      ...(d.activo !== undefined ? { activo: d.activo } : {}),
    })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo guardar el cambio. " + error.message };
  revalidatePath(`/panel/proveedores/${id}`);
  revalidatePath("/panel/proveedores");
  return { ok: true };
}

export async function registrarPagoProveedor(
  proveedorId: string,
  monto: number,
  formaPago: "efectivo" | "transferencia" | "qr",
  notas: string | null
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_pago_proveedor", {
    p_proveedor_id: proveedorId,
    p_monto: monto,
    p_forma_pago: formaPago,
    p_notas: notas,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/proveedores/${proveedorId}`);
  revalidatePath("/panel/proveedores");
  return { ok: true };
}

export async function registrarDeudaProveedor(
  proveedorId: string,
  monto: number,
  notas: string | null
): Promise<ResultadoAccion> {
  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_deuda_proveedor", {
    p_proveedor_id: proveedorId,
    p_monto: monto,
    p_notas: notas,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/panel/proveedores/${proveedorId}`);
  revalidatePath("/panel/proveedores");
  return { ok: true };
}
