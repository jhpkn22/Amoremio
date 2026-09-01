"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true; id?: string } | { ok: false; error: string };

const clienteSchema = z.object({
  nombre: z.string().min(2, "Poné el nombre del cliente."),
  telefono: z.string().trim().optional().nullable(),
  documento: z.string().trim().optional().nullable(),
  limite_credito: z.coerce.number().min(0).optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export async function crearCliente(input: ClienteInput): Promise<ResultadoAccion> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nombre: d.nombre,
      telefono: d.telefono || null,
      documento: d.documento || null,
      limite_credito: d.limite_credito ?? null,
      notas: d.notas || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo crear el cliente. " + (error?.message ?? "") };
  revalidatePath("/panel/clientes");
  return { ok: true, id: data.id };
}

export async function actualizarCliente(id: string, input: ClienteInput): Promise<ResultadoAccion> {
  const parsed = clienteSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  await exigirUsuario();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
      telefono: d.telefono || null,
      documento: d.documento || null,
      limite_credito: d.limite_credito ?? null,
      notas: d.notas || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el cambio. " + error.message };
  revalidatePath(`/panel/clientes/${id}`);
  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/deudas/${id}`);
  return { ok: true };
}
