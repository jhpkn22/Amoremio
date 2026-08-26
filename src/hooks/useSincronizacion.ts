"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { contarPendientes } from "@/lib/caja/db";
import { sincronizarCola } from "@/lib/caja/sync";

export type EstadoConexion = "en-linea" | "sin-conexion" | "sincronizando";

export function useSincronizacion() {
  // se calcula en el primer render del cliente (con guarda para SSR) en
  // vez de en un efecto, para no disparar un setState síncrono de arranque
  const [enLinea, setEnLinea] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizandoRef = useRef(false);

  const refrescarPendientes = useCallback(async () => {
    setPendientes(await contarPendientes());
  }, []);

  const sincronizarAhora = useCallback(async () => {
    if (sincronizandoRef.current || !navigator.onLine) return;
    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const supabase = createClient();
      await sincronizarCola(supabase);
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
      await refrescarPendientes();
    }
  }, [refrescarPendientes]);

  useEffect(() => {
    // llamada directa (no via refrescarPendientes) para que el setState
    // quede anidado dentro del .then y no como invocación síncrona en el
    // cuerpo del efecto
    contarPendientes().then(setPendientes);

    function onOnline() {
      setEnLinea(true);
      sincronizarAhora();
    }
    function onOffline() {
      setEnLinea(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("amoremio:cola-actualizada", refrescarPendientes);

    // por si algo quedó pendiente de una sesión anterior, reintenta cada 30s
    const intervalo = setInterval(() => {
      if (navigator.onLine) sincronizarAhora();
    }, 30_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("amoremio:cola-actualizada", refrescarPendientes);
      clearInterval(intervalo);
    };
  }, [sincronizarAhora, refrescarPendientes]);

  const estado: EstadoConexion = sincronizando ? "sincronizando" : enLinea ? "en-linea" : "sin-conexion";

  return { estado, pendientes, sincronizarAhora, refrescarPendientes };
}
