import type { SupabaseClient } from "@supabase/supabase-js";
import { listarPendientes, quitarDeLaCola, actualizarIntento, esPayloadV2 } from "./db";

export interface ResultadoSincronizacion {
  sincronizadas: number;
  fallidas: number;
}

/**
 * Procesa la cola local: intenta confirmar cada venta pendiente contra
 * Supabase. Las RPC (confirmar_venta_v2 / confirmar_venta) son
 * idempotentes por client_uuid, así que reintentar una venta que ya se
 * guardó no la duplica — devuelve la misma venta de nuevo.
 */
export async function sincronizarCola(supabase: SupabaseClient): Promise<ResultadoSincronizacion> {
  const pendientes = await listarPendientes();
  let sincronizadas = 0;
  let fallidas = 0;

  for (const venta of pendientes) {
    const rpc = esPayloadV2(venta.payload) ? "confirmar_venta_v2" : "confirmar_venta";
    const { error } = await supabase.rpc(rpc, venta.payload);
    if (error) {
      fallidas++;
      await actualizarIntento(venta.client_uuid, error.message);
      continue;
    }
    await quitarDeLaCola(venta.client_uuid);
    sincronizadas++;
  }

  return { sincronizadas, fallidas };
}
