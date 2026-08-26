"use client";

import { useEffect } from "react";

/** PWA instalable — registro silencioso, no bloquea nada si falla. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
