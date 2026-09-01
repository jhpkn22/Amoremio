import Link from "next/link";
import { Barcode } from "lucide-react";
import { formatGs } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Articulo } from "@/lib/types/database";

const etiquetaOrigen: Record<Articulo["codigo_barras_origen"], string> = {
  fabrica: "Código de fábrica",
  generado: "Código generado",
  asignado: "Código asignado",
  sin_codigo: "Sin código",
};

export function ArticuloRow({ articulo }: { articulo: Articulo }) {
  const conCodigo = !!articulo.codigo_barras;
  return (
    <Link
      href={`/panel/productos/${articulo.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 hover:border-border-strong sm:p-3"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-400">
        <Barcode size={20} className={conCodigo ? "" : "opacity-40"} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-ink-900">{articulo.nombre}</p>
        <p className="font-mono text-[12px] text-ink-600">
          {articulo.codigo_interno}
          {articulo.codigo_barras ? ` · ${articulo.codigo_barras}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tono={conCodigo ? "neutral" : "alerta"}>{etiquetaOrigen[articulo.codigo_barras_origen]}</Badge>
          {articulo.descuento_pct > 0 && <Badge tono="exito">-{articulo.descuento_pct}%</Badge>}
          {!articulo.activo && <Badge tono="neutral">Inactivo</Badge>}
        </div>
      </div>

      <p className="tabular shrink-0 text-[15px] font-bold text-ink-900">{formatGs(articulo.precio_venta)}</p>
    </Link>
  );
}
