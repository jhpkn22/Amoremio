/** Ranking en barras horizontales (SVG, sin librerías). */
export interface FilaRanking {
  etiqueta: string;
  valor: number;
  sub?: string;
}

export function BarrasHorizontal({
  datos,
  formato = (n) => n.toLocaleString("es-PY"),
}: {
  datos: FilaRanking[];
  formato?: (n: number) => string;
}) {
  if (datos.length === 0) {
    return <p className="py-6 text-center text-[13px] text-ink-600">Sin datos todavía.</p>;
  }
  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map((d, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="min-w-0 truncate font-medium text-ink-900">{d.etiqueta}</span>
            <span className="tabular shrink-0 font-semibold text-ink-900">{formato(d.valor)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-rose-50">
            <div
              className="h-full rounded-full bg-rose-500"
              style={{ width: `${Math.max(3, (d.valor / max) * 100)}%` }}
            />
          </div>
          {d.sub && <p className="mt-0.5 text-[11.5px] text-ink-600">{d.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
