"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatGs } from "@/lib/utils";
import { aplicarDescuento, quitarDescuento, aplicarDescuentoGrupo } from "@/app/panel/inteligencia/actions";

export interface FilaInteligencia {
  id: string;
  nombre: string;
  codigo_interno: string;
  dias: number;
  pct: 0 | 10 | 15 | 20 | 25;
  stock: number;
  capital: number;
  precio_actual: number;
  precio_lista: number;
  precio_sugerido: number;
  descuento_pct: number;
  vendido_90: number;
}

const BUCKETS: { pct: 10 | 15 | 20 | 25; titulo: string }[] = [
  { pct: 10, titulo: "Más de 3 meses — 10%" },
  { pct: 15, titulo: "Más de 6 meses — 15%" },
  { pct: 20, titulo: "Más de 12 meses — 20%" },
  { pct: 25, titulo: "Más de 24 meses — 25%" },
];

function antiguedad(dias: number) {
  if (dias >= 365) return `${Math.floor(dias / 365)} a ${Math.floor((dias % 365) / 30)} m`;
  if (dias >= 30) return `${Math.floor(dias / 30)} meses`;
  return `${dias} días`;
}

export function TablaInteligencia({ filas }: { filas: FilaInteligencia[] }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function correr(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "No se pudo aplicar.");
      else router.refresh();
    });
  }

  const sinSugerencia = filas.filter((f) => f.pct === 0);

  return (
    <div className="space-y-5">
      {error && <p className="text-[12.5px] font-medium text-alert">{error}</p>}

      {BUCKETS.map(({ pct, titulo }) => {
        const grupo = filas.filter((f) => f.pct === pct);
        const idsSinAplicar = grupo.filter((f) => f.descuento_pct !== pct).map((f) => f.id);
        return (
          <div key={pct} className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <p className="text-[13.5px] font-bold text-ink-900">
                {titulo} <span className="font-normal text-ink-600">· {grupo.length}</span>
              </p>
              {idsSinAplicar.length > 0 && (
                <Button
                  variante="secundario"
                  disabled={pendiente}
                  onClick={() => correr(() => aplicarDescuentoGrupo(idsSinAplicar, pct))}
                >
                  Aplicar a los {idsSinAplicar.length}
                </Button>
              )}
            </div>
            {grupo.length === 0 ? (
              <p className="px-4 py-4 text-[12.5px] text-ink-600">Ningún artículo en este tramo por ahora.</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-ink-600">
                  <tr>
                    <th className="px-4 py-2">Artículo</th>
                    <th className="px-4 py-2 text-right">Antigüedad</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2 text-right">Capital</th>
                    <th className="px-4 py-2 text-right">Precio</th>
                    <th className="px-4 py-2 text-right">Sugerido</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {grupo.map((f) => {
                    const aplicado = f.descuento_pct === pct;
                    return (
                      <tr key={f.id} className="border-t border-border">
                        <td className="px-4 py-2">
                          <p className="font-medium text-ink-900">{f.nombre}</p>
                          <p className="font-mono text-[11px] text-ink-600">{f.codigo_interno}</p>
                        </td>
                        <td className="tabular px-4 py-2 text-right text-ink-600">{antiguedad(f.dias)}</td>
                        <td className="tabular px-4 py-2 text-right">{f.stock}</td>
                        <td className="tabular px-4 py-2 text-right text-ink-600">{formatGs(f.capital)}</td>
                        <td className="tabular px-4 py-2 text-right">{formatGs(f.precio_actual)}</td>
                        <td className={cn("tabular px-4 py-2 text-right font-semibold", aplicado ? "text-success" : "text-rose-700")}>
                          {formatGs(f.precio_sugerido)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {aplicado ? (
                            <button
                              onClick={() => correr(() => quitarDescuento(f.id))}
                              disabled={pendiente}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[12px] font-semibold text-ink-600 hover:bg-rose-50"
                            >
                              <RotateCcw size={12} /> Quitar
                            </button>
                          ) : (
                            <button
                              onClick={() => correr(() => aplicarDescuento(f.id, pct))}
                              disabled={pendiente}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[12px] font-semibold text-ink-900 hover:bg-rose-700 hover:text-white"
                            >
                              <Check size={12} /> Aplicar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })}

      {filas.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-[13px] text-ink-600">
          Todavía no hay artículos activos con stock para analizar.
        </p>
      )}

      {sinSugerencia.length > 0 && !filas.every((f) => f.pct === 0) && (
        <p className="text-[12px] text-ink-600">{sinSugerencia.length} artículo(s) con menos de 3 meses — sin sugerencia.</p>
      )}
    </div>
  );
}
