"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSincronizacion } from "@/hooks/useSincronizacion";
import { cn } from "@/lib/utils";

/** El indicador de sincronización que pide el brief — siempre visible en la Caja. */
export function EstadoConexion() {
  const { estado, pendientes, sincronizarAhora } = useSincronizacion();

  const config = {
    "en-linea": {
      Icon: Wifi,
      texto: pendientes > 0 ? `${pendientes} por enviar` : "En línea",
      clase: "bg-success-soft text-success",
    },
    "sin-conexion": {
      Icon: WifiOff,
      texto: pendientes > 0 ? `Sin conexión · ${pendientes} en espera` : "Sin conexión",
      clase: "bg-alert-soft text-alert",
    },
    sincronizando: {
      Icon: RefreshCw,
      texto: "Sincronizando…",
      clase: "bg-rose-50 text-rose-700",
    },
  }[estado];

  const { Icon } = config;

  return (
    <button
      onClick={() => sincronizarAhora()}
      disabled={estado !== "en-linea" || pendientes === 0}
      data-mantiene-foco
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold disabled:cursor-default",
        config.clase
      )}
      title="Tocá para forzar la sincronización"
    >
      <Icon size={13} className={estado === "sincronizando" ? "animate-spin" : ""} />
      {config.texto}
    </button>
  );
}
