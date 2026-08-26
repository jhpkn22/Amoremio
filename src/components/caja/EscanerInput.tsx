"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";

/**
 * El "escáner físico" HID (el lector de mano que se conecta como
 * teclado) no tiene API propia: simplemente tipea el código y manda
 * un Enter, rapidísimo. Este input tiene que estar SIEMPRE enfocado
 * para capturarlo — por eso se reenfoca solo ante cualquier click que
 * no sea explícitamente de otro control (marcado con
 * data-mantiene-foco) y se apaga del todo mientras `activo` es false
 * (cámara o algún modal abierto encima).
 */
export function EscanerInput({
  activo,
  onEscaneo,
}: {
  activo: boolean;
  onEscaneo: (codigo: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (!activo) return;
    const input = ref.current;
    input?.focus();

    function alHacerClic(e: MouseEvent) {
      const objetivo = e.target as HTMLElement | null;
      if (objetivo?.closest("[data-mantiene-foco]")) return;
      input?.focus();
    }
    function alVolverElFoco() {
      input?.focus();
    }

    document.addEventListener("click", alHacerClic);
    window.addEventListener("focus", alVolverElFoco);
    return () => {
      document.removeEventListener("click", alHacerClic);
      window.removeEventListener("focus", alVolverElFoco);
    };
  }, [activo]);

  function alTipear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = valor.trim();
    setValor("");
    if (codigo) onEscaneo(codigo);
  }

  return (
    <div className="relative">
      <ScanLine size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400" />
      <input
        ref={ref}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={alTipear}
        disabled={!activo}
        placeholder="Escaneá un código de barras…"
        inputMode="text"
        autoComplete="off"
        className="min-h-14 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3.5 text-[16px] font-medium text-ink-900 placeholder:text-ink-600/60 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50"
      />
    </div>
  );
}
