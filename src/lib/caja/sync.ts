import type { SupabaseClient } from "@supabase/supabase-js";
import { listarPendientes, quitarDeLaCola, actualizarIntento } from "./db";

export interface ResultadoSincronizacion {
  sincronizadas: number;
  fallidas: number;
}

/**
 * Procesa la cola local: intenta confirmar cada venta pendiente contra
 * Supabase. confirmar_venta() es idempotente por client_uuid (ver
 * amoremio-schema.sql), así que reintentar una venta que en realidad
 * ya se guardó la vez anterior no la duplica — simplemente devuelve la
 * misma venta de nuevo.
 */
export async function sincronizarCola(supabase: SupabaseClient): Promise<ResultadoSincronizacion> {
  const pendientes = await listarPendientes();
  let sincronizadas = 0;
  let fallidas = 0;

  for (const venta of pendientes) {
    const { error } = await supabase.rpc("confirmar_venta", venta.payload);
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
