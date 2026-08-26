import type { SupabaseClient } from "@supabase/supabase-js";

const NUMERO_POR_DEFECTO = "595985791322";

/** El único valor de `configuracion` legible por anon (ver RLS: config_select_publico). */
export async function obtenerWhatsAppLocal(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from("configuracion").select("valor").eq("clave", "whatsapp_numero_local").maybeSingle();
  return (data?.valor as string) ?? NUMERO_POR_DEFECTO;
}
