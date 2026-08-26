"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeLabel({ codigo, nombre }: { codigo: string; nombre: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, codigo, {
      format: "CODE128",
      width: 2,
      height: 50,
      fontSize: 13,
      margin: 6,
      font: "JetBrains Mono, monospace",
    });
  }, [codigo]);

  return (
    <div className="etiqueta flex w-full max-w-[280px] flex-col items-center gap-1 rounded-xl border border-border bg-white p-3 text-center print:border-0 print:p-0">
      <p className="max-w-full truncate text-[12px] font-semibold text-ink-900">{nombre}</p>
      <svg ref={svgRef} />
    </div>
  );
}
