/**
 * Mapa de calor día de la semana x hora. `matriz[dia][hora]` = cantidad
 * de ventas (dia 0 = Lunes). SVG, sin librerías.
 */
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function HeatmapHoras({ matriz }: { matriz: number[][] }) {
  const max = Math.max(1, ...matriz.flat());
  const celda = 15;
  const gap = 2;
  const labelW = 30;
  const labelH = 14;
  const horas = Array.from({ length: 24 }, (_, h) => h);
  const ancho = labelW + horas.length * (celda + gap);
  const alto = labelH + DIAS.length * (celda + gap);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} className="max-w-full">
        {horas.map((h) =>
          h % 3 === 0 ? (
            <text
              key={`h${h}`}
              x={labelW + h * (celda + gap) + celda / 2}
              y={labelH - 4}
              textAnchor="middle"
              className="fill-ink-600 text-[8px]"
            >
              {h}h
            </text>
          ) : null
        )}
        {DIAS.map((d, di) => (
          <text
            key={d}
            x={0}
            y={labelH + di * (celda + gap) + celda / 2 + 3}
            className="fill-ink-600 text-[9px] font-semibold"
          >
            {d}
          </text>
        ))}
        {matriz.map((fila, di) =>
          fila.map((v, hi) => {
            const op = v === 0 ? 0.06 : 0.15 + (v / max) * 0.85;
            return (
              <rect
                key={`${di}-${hi}`}
                x={labelW + hi * (celda + gap)}
                y={labelH + di * (celda + gap)}
                width={celda}
                height={celda}
                rx={2}
                className="fill-rose-600"
                style={{ opacity: op }}
              >
                <title>{`${DIAS[di]} ${hi}h — ${v} venta(s)`}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
