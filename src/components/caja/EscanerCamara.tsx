"use client";

import { useEffect, useRef, useState } from "react";
import { X, CameraOff } from "lucide-react";

/**
 * Segunda vía de escaneo que pide el brief: cámara del celular vía
 * @zxing/browser cuando no hay lector físico a mano. Se abre como
 * modal a pantalla completa y se cierra sola apenas detecta algo (el
 * padre decide qué hacer con el código).
 */
export function EscanerCamara({
  onDetectado,
  onCerrar,
}: {
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const yaDetectoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    let controles: { stop: () => void } | undefined;

    import("@zxing/browser")
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelado || !videoRef.current) return;
        const lector = new BrowserMultiFormatReader();
        return lector.decodeFromVideoDevice(undefined, videoRef.current, (resultado) => {
          if (cancelado || yaDetectoRef.current || !resultado) return;
          yaDetectoRef.current = true;
          onDetectado(resultado.getText());
        });
      })
      .then((ctrl) => {
        if (cancelado) ctrl?.stop();
        else controles = ctrl;
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo acceder a la cámara. Revisá los permisos del navegador para este sitio.");
      });

    return () => {
      cancelado = true;
      controles?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3">
        <p className="text-[14px] font-semibold text-white">Escaneá el código de barras</p>
        <button
          onClick={onCerrar}
          data-mantiene-foco
          className="rounded-full bg-white/10 p-2.5 text-white"
          aria-label="Cerrar cámara"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <CameraOff size={32} className="text-white/60" />
            <p className="text-[14px] text-white/80">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-rose-400" />
          </>
        )}
      </div>

      <div className="p-4">
        <button
          onClick={onCerrar}
          data-mantiene-foco
          className="min-h-11 w-full rounded-xl bg-white/10 text-[14px] font-semibold text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
