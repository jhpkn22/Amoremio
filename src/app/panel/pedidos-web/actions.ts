"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

interface ItemPedidoWeb {
  producto_id: string;
  nombre: string;
  codigo_interno: string;
  cantidad: number;
  precio_unitario: number;
}

/** Descuenta stock de cada producto del pedido (un movimiento 'salida' por item) y lo marca procesado. */
export async function descontarStockPedido(pedidoId: string): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: pedido, error: errorPedido } = await supabase
    .from("pedidos_web")
    .select("id, items, estado")
    .eq("id", pedidoId)
    .single();

  if (errorPedido || !pedido) return { ok: false, error: "No se encontró el pedido." };
  if (pedido.estado !== "pendiente") return { ok: false, error: "Este pedido ya fue procesado." };

  const items = pedido.items as ItemPedidoWeb[];

  for (const item of items) {
    const { error } = await supabase.from("movimientos_stock").insert({
      producto_id: item.producto_id,
      tipo: "salida",
      cantidad: -Math.abs(item.cantidad),
      motivo: `Pedido web #${pedidoId.slice(0, 8)}`,
      usuario_id: usuario.id,
    });
    if (error) return { ok: false, error: `No se pudo descontar "${item.nombre}": ${error.message}` };
  }

  const { error: errorUpdate } = await supabase
    .from("pedidos_web")
    .update({ estado: "procesado", procesado_por: usuario.id, procesado_at: new Date().toISOString() })
    .eq("id", pedidoId);

  if (errorUpdate) return { ok: false, error: errorUpdate.message };

  revalidatePath("/panel/pedidos-web");
  return { ok: true };
}

/** Marca el pedido como procesado SIN tocar stock (ej: ya se descontó a mano, o se coordinó distinto). */
export async function marcarProcesadoSinStock(pedidoId: string): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pedidos_web")
    .update({ estado: "procesado", procesado_por: usuario.id, procesado_at: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/pedidos-web");
  return { ok: true };
}

export async function descartarPedido(pedidoId: string): Promise<ResultadoAccion> {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pedidos_web")
    .update({ estado: "descartado", procesado_por: usuario.id, procesado_at: new Date().toISOString() })
    .eq("id", pedidoId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/pedidos-web");
  return { ok: true };
}
