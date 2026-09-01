"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanLine, Sparkles, RefreshCw, Lock, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarcodeLabel } from "./BarcodeLabel";
import { generarCodigoBarras, asignarCodigoBarras } from "@/app/panel/productos/actions";
import type { Articulo } from "@/lib/types/database";

const etiquetaOrigen: Record<Articulo["codigo_barras_origen"], string> = {
  fabrica: "De fábrica",
  generado: "Generado",
  asignado: "Asignado",
  sin_codigo: "Sin código",
};

export function CodigoBarrasPanel({ articulo }: { articulo: Articulo }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState("");
  const [modoScan, setModoScan] = useState(false);

  const { codigo_barras: codigo, codigo_barras_origen: origen, codigo_barras_impreso: impreso } = articulo;
  const esDeFabrica = origen === "fabrica";
  // se puede cambiar el código mientras NO sea de fábrica y NO se haya impreso
  const editable = !esDeFabrica && !impreso;

  async function accion(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setTrabajando(true);
    const res = await fn();
    setTrabajando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo completar la acción.");
      return;
    }
    setScan("");
    setModoScan(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tono={codigo ? "neutral" : "alerta"}>{etiquetaOrigen[origen]}</Badge>
        {impreso && (
          <Badge tono="neutral">
            <Lock size={12} /> Etiqueta impresa — código fijo
          </Badge>
        )}
        {codigo && <span className="font-mono text-[13px] text-ink-900">{codigo}</span>}
      </div>

      {codigo && (
        <div className="flex flex-wrap items-end gap-3">
          <BarcodeLabel codigo={codigo} nombre={articulo.nombre} />
          <Link
            href={`/panel/productos/${articulo.id}/etiqueta`}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Tag size={16} /> Ver / imprimir etiqueta
          </Link>
        </div>
      )}

      {esDeFabrica && (
        <p className="text-[13px] text-ink-600">
          Este artículo se creó con un código de fábrica: no se puede cambiar.
        </p>
      )}

      {editable && !modoScan && (
        <div className="flex flex-wrap gap-2">
          <Button
            variante={codigo ? "secundario" : "primario"}
            disabled={trabajando}
            onClick={() => accion(() => generarCodigoBarras(articulo.id))}
          >
            {codigo ? <RefreshCw size={16} /> : <Sparkles size={16} />}
            {codigo ? "Regenerar código" : "Generar código"}
          </Button>
          <Button variante="secundario" disabled={trabajando} onClick={() => setModoScan(true)}>
            <ScanLine size={16} /> {codigo ? "Reasignar escaneando" : "Asignar escaneando"}
          </Button>
        </div>
      )}

      {editable && modoScan && (
        <div className="rounded-xl border border-border p-3">
          <div className="relative">
            <ScanLine size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400" />
            <input
              value={scan}
              autoFocus
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (scan.trim()) accion(() => asignarCodigoBarras(articulo.id, scan.trim()));
                }
              }}
              placeholder="Escaneá un código de barras real…"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3.5 text-[16px] font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              disabled={trabajando || !scan.trim()}
              onClick={() => accion(() => asignarCodigoBarras(articulo.id, scan.trim()))}
            >
              Asignar
            </Button>
            <Button variante="secundario" onClick={() => setModoScan(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-[12.5px] font-medium text-alert">{error}</p>}
    </div>
  );
}
