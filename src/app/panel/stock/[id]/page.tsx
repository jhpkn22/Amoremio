import { notFound } from "next/navigation";
import Link from "next/link";
import { Barcode, ArrowLeft, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ProductoForm } from "@/components/stock/ProductoForm";
import { FotosUploader } from "@/components/stock/FotosUploader";
import { VariantesEditor } from "@/components/stock/VariantesEditor";
import { MovimientoForm } from "@/components/stock/MovimientoForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatGs, cn } from "@/lib/utils";
import type { Categoria, MovimientoStock, Producto, ProductoFoto, Variante } from "@/lib/types/database";

const iconosMovimiento = {
  entrada: ArrowDownCircle,
  devolucion: ArrowDownCircle,
  salida: ArrowUpCircle,
  ajuste: SlidersHorizontal,
};

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";
  const supabase = await createClient();

  const [{ data: producto, error }, { data: categorias }, { data: variantes }, { data: movimientos }] =
    await Promise.all([
      supabase
        .from("productos")
        .select("*, producto_fotos(*), producto_costos(precio_costo)")
        .eq("id", id)
        .is("deleted_at", null)
        .single(),
      supabase.from("categorias").select("*").is("deleted_at", null).order("orden"),
      supabase.from("variantes").select("*").eq("producto_id", id).is("deleted_at", null).order("codigo_interno"),
      supabase
        .from("movimientos_stock")
        .select("*, usuarios(nombre)")
        .eq("producto_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  if (error || !producto) notFound();
  const p = producto as Producto;
  const fotos = ((p.producto_fotos as ProductoFoto[]) ?? []).sort((a, b) => a.orden - b.orden);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/panel/stock" className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver al stock
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">{p.nombre}</h1>
          <p className="font-mono text-[13px] text-ink-600">{p.codigo_interno}</p>
        </div>
        <Link
          href={`/panel/stock/${p.id}/etiqueta`}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
        >
          <Barcode size={18} /> Código de barras
        </Link>
      </div>

      <div className="space-y-5">
        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Fotos</h2>
          <FotosUploader productoId={p.id} fotosIniciales={fotos} />
        </Card>

        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Datos del producto</h2>
          <ProductoForm
            modo="editar"
            producto={p}
            categorias={(categorias as Categoria[]) ?? []}
            esAdmin={esAdmin}
            costoActual={p.producto_costos?.precio_costo ?? null}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Variantes</h2>
          <p className="mb-3 text-[13px] text-ink-600">
            Si este producto viene en distintos talles, colores o modelos, cargalos acá — cada uno lleva su propio
            stock y código de barras.
          </p>
          <VariantesEditor productoId={p.id} variantesIniciales={(variantes as Variante[]) ?? []} />
        </Card>

        <Card>
          <h2 className="mb-1 text-[15px] font-bold text-ink-900">Movimientos de stock</h2>
          <p className="mb-3 text-[13px] text-ink-600">
            Acá se ajusta el stock — nunca se edita el número directamente, así queda quién hizo qué y cuándo.
          </p>
          <MovimientoForm productoId={p.id} variantes={(variantes as Variante[]) ?? []} />

          <div className="mt-4 flex flex-col gap-1.5">
            {((movimientos as MovimientoStock[]) ?? []).length === 0 && (
              <p className="py-4 text-center text-[13px] text-ink-600">Todavía no hay movimientos registrados.</p>
            )}
            {((movimientos as MovimientoStock[]) ?? []).map((m) => {
              const Icono = iconosMovimiento[m.tipo];
              const positivo = m.cantidad > 0;
              return (
                <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                  <Icono size={18} className={positivo ? "text-success" : "text-alert"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink-900">
                      {m.motivo || (m.tipo === "salida" ? "Venta" : m.tipo)}
                    </p>
                    <p className="text-[12px] text-ink-600">
                      {new Date(m.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}
                      {" · "}
                      {m.usuarios?.nombre ?? "—"}
                    </p>
                  </div>
                  <span className={cn("tabular text-[14px] font-bold", positivo ? "text-success" : "text-alert")}>
                    {positivo ? "+" : ""}
                    {m.cantidad}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-600">Estado actual:</span>
          {p.stock_actual <= 0 && !p.es_a_pedido && <Badge tono="alerta">Sin stock</Badge>}
          {p.stock_actual > 0 && p.stock_actual <= p.stock_minimo && <Badge tono="alerta">Stock bajo</Badge>}
          {p.stock_actual > p.stock_minimo && <Badge tono="exito">Stock ok</Badge>}
          <span className="tabular text-[13px] text-ink-600">{p.stock_actual} unidades · {formatGs(p.precio_venta)}</span>
        </div>
      </div>
    </div>
  );
}
