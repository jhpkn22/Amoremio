import Link from "next/link";
import { ImageOff } from "lucide-react";
import { formatGs, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { urlFotoProducto } from "@/lib/supabase/storage";
import type { Producto } from "@/lib/types/database";

export function ProductoRow({ producto }: { producto: Producto }) {
  const sinStock = producto.stock_actual <= 0 && !producto.es_a_pedido;
  const stockBajo = !sinStock && producto.stock_actual <= producto.stock_minimo;
  const foto = producto.producto_fotos?.[0];

  return (
    <Link
      href={`/panel/stock/${producto.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 hover:border-border-strong sm:p-3"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rose-50">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlFotoProducto(foto.path_thumbnail ?? foto.path_original)} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={18} className="text-rose-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-ink-900">{producto.nombre}</p>
        <p className="font-mono text-[12px] text-ink-600">{producto.codigo_interno}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {sinStock && <Badge tono="alerta">Sin stock</Badge>}
          {stockBajo && <Badge tono="alerta">Quedan {producto.stock_actual}</Badge>}
          {producto.es_a_pedido && <Badge tono="neutral">A pedido</Badge>}
          {!producto.visible_en_vitrina && <Badge tono="neutral">Oculto</Badge>}
        </div>
      </div>

      <p className={cn("tabular shrink-0 text-[15px] font-bold text-ink-900")}>{formatGs(producto.precio_venta)}</p>
    </Link>
  );
}
