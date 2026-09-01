"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Renderiza el código como EAN-13 si son 13 dígitos, si no CODE128. */
export function BarcodeLabel({ codigo, nombre }: { codigo: string; nombre: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const formato = /^\d{13}$/.test(codigo) ? "EAN13" : "CODE128";
    try {
      JsBarcode(svgRef.current, codigo, {
        format: formato,
        width: 2,
        height: 50,
        fontSize: 13,
        margin: 6,
        font: "JetBrains Mono, monospace",
      });
    } catch {
      JsBarcode(svgRef.current, codigo, { format: "CODE128", width: 2, height: 50, fontSize: 13, margin: 6 });
    }
  }, [codigo]);

  return (
    <div className="etiqueta flex w-full max-w-[280px] flex-col items-center gap-1 rounded-xl border border-border bg-white p-3 text-center print:border-0 print:p-0">
      <p className="max-w-full truncate text-[12px] font-semibold text-ink-900">{nombre}</p>
      <svg ref={svgRef} />
    </div>
  );
}
