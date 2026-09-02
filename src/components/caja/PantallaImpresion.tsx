"use client";

/**
 * Pantalla de espera a pantalla completa mientras se registra la venta y
 * se imprime el ticket. Muestra el ísotipo "AM" con un latido suave y un
 * anillo girando, más el wordmark de la marca. Respeta prefers-reduced-motion
 * (apagado global en globals.css).
 */
export function PantallaImpresion({ fase }: { fase: "registrando" | "imprimiendo" }) {
  const texto = fase === "registrando" ? "Registrando la venta" : "Imprimiendo el ticket";

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex flex-col items-center justify-center gap-7 bg-bg/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* anillo punteado que gira */}
        <svg className="am-giro absolute inset-0" viewBox="0 0 112 112" aria-hidden>
          <circle
            cx="56"
            cy="56"
            r="52"
            fill="none"
            stroke="var(--color-rose-400)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 14"
          />
        </svg>
        {/* ísotipo AM con latido */}
        <svg className="am-latido h-20 w-20" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="32" fill="var(--color-rose-600)" />
          <text
            x="32"
            y="41"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="24"
            fontWeight="700"
            fill="var(--color-ink-900)"
          >
            AM
          </text>
        </svg>
      </div>

      <div className="text-center">
        <p className="font-display text-4xl leading-none text-rose-700">Amore Mío</p>
        <p className="am-puntos mt-2 text-[14px] font-semibold text-ink-600">{texto}</p>
      </div>
    </div>
  );
}
