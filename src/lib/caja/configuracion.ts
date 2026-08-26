import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConfigTicket } from "@/lib/ticket/escpos";
import type { RutaImpresion } from "@/lib/ticket/imprimir";

export interface ConfiguracionCaja {
  rutaImpresion: RutaImpresion;
  configTicket: ConfigTicket;
}

const CLAVES = ["ticket_ancho_mm", "ticket_chars_por_linea", "ticket_ruta_impresion"] as const;

const POR_DEFECTO: ConfiguracionCaja = {
  rutaImpresion: "web_bluetooth",
  configTicket: { anchoMm: 58, charsPorLinea: 32 },
};

/** Lee la fila clave/valor de `configuracion` — global, la comparte cualquier caja del local. */
export async function cargarConfiguracionCaja(supabase: SupabaseClient): Promise<ConfiguracionCaja> {
  const { data } = await supabase.from("configuracion").select("clave, valor").in("clave", CLAVES);
  const mapa = new Map<string, unknown>((data ?? []).map((f: { clave: string; valor: unknown }) => [f.clave, f.valor]));

  return {
    rutaImpresion: (mapa.get("ticket_ruta_impresion") as RutaImpresion) ?? POR_DEFECTO.rutaImpresion,
    configTicket: {
      anchoMm: (mapa.get("ticket_ancho_mm") as 58 | 80) ?? POR_DEFECTO.configTicket.anchoMm,
      charsPorLinea: (mapa.get("ticket_chars_por_linea") as number) ?? POR_DEFECTO.configTicket.charsPorLinea,
    },
  };
}

/** Solo admin puede guardar (RLS: config_update_admin) — se llama desde Configuración. */
export async function guardarConfiguracionCaja(supabase: SupabaseClient, cfg: ConfiguracionCaja) {
  const filas = [
    { clave: "ticket_ruta_impresion", valor: cfg.rutaImpresion },
    { clave: "ticket_ancho_mm", valor: cfg.configTicket.anchoMm },
    { clave: "ticket_chars_por_linea", valor: cfg.configTicket.charsPorLinea },
  ];
  for (const fila of filas) {
    const { error } = await supabase.from("configuracion").update({ valor: fila.valor }).eq("clave", fila.clave);
    if (error) throw error;
  }
}
