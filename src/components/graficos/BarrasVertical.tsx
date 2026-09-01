/**
 * Gráfico de barras verticales en SVG, sin librerías. Responsive por
 * viewBox; el contenedor hace scroll horizontal si hay muchas barras.
 */
export interface PuntoBarra {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
}

export function BarrasVertical({
  datos,
  formato = (n) => n.toLocaleString("es-PY"),
  alto = 180,
}: {
  datos: PuntoBarra[];
  formato?: (n: number) => string;
  alto?: number;
}) {
  if (datos.length === 0) {
    return <p className="py-8 text-center text-[13px] text-ink-600">Sin datos todavía.</p>;
  }

  const max = Math.max(...datos.map((d) => d.valor), 1);
  const anchoBarra = 34;
  const gap = 14;
  const padTop = 18;
  const padBottom = 34;
  const ancho = datos.length * (anchoBarra + gap) + gap;
  const altoGrafico = alto - padTop - padBottom;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} className="max-w-full">
        {datos.map((d, i) => {
          const h = Math.max(2, (d.valor / max) * altoGrafico);
          const x = gap + i * (anchoBarra + gap);
          const y = padTop + (altoGrafico - h);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={anchoBarra}
                height={h}
                rx={4}
                className={d.destacado ? "fill-rose-600" : "fill-rose-300"}
              />
              <text
                x={x + anchoBarra / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-ink-600 text-[9px]"
              >
                {formato(d.valor)}
              </text>
              <text
                x={x + anchoBarra / 2}
                y={alto - 12}
                textAnchor="middle"
                className="fill-ink-600 text-[10px] font-semibold"
              >
                {d.etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
