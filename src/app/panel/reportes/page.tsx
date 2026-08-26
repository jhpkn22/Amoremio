import { TrendingUp, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatGs, cn } from "@/lib/utils";

interface FilaReporte {
  id: string;
  nombre: string;
  codigo_interno: string;
  stock: number;
  costo: number | null;
  precio_venta: number;
  valor: number;
  margen: number | null;
  margenPct: number | null;
}

export default async function ReportesPage() {
  await exigirUsuario({ soloAdmin: true });
  const supabase = await createClient();

  interface FilaConsulta {
    id: string;
    nombre: string;
    codigo_interno: string;
    precio_venta: number;
    stock_actual: number;
    tiene_variantes: boolean;
    producto_costos: { precio_costo: number } | null;
    variantes: { stock_actual: number; deleted_at: string | null }[] | null;
  }

  const { data } = await supabase
    .from("productos")
    .select("id, nombre, codigo_interno, precio_venta, stock_actual, tiene_variantes, producto_costos(precio_costo), variantes(stock_actual, deleted_at)")
    .is("deleted_at", null)
    .returns<FilaConsulta[]>();

  const filas: FilaReporte[] = (data ?? []).map((p) => {
    const stock = p.tiene_variantes
      ? (p.variantes ?? []).filter((v) => !v.deleted_at).reduce((acc, v) => acc + v.stock_actual, 0)
      : p.stock_actual;
    const costo = p.producto_costos?.precio_costo ?? null;
    const margen = costo !== null ? p.precio_venta - costo : null;
    return {
      id: p.id,
      nombre: p.nombre,
      codigo_interno: p.codigo_interno,
      stock,
      costo,
      precio_venta: p.precio_venta,
      valor: stock * (costo ?? 0),
      margen,
      margenPct: margen !== null && p.precio_venta > 0 ? (margen / p.precio_venta) * 100 : null,
    };
  });

  const valorTotal = filas.reduce((acc, f) => acc + f.valor, 0);
  const sinCosto = filas.filter((f) => f.costo === null).length;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Reportes</h1>
      <p className="mb-5 text-[13px] text-ink-600">Solo vos ves esto — costos y márgenes no aparecen en ninguna otra pantalla del panel.</p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <PiggyBank size={20} />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">Valorización del inventario</p>
            <p className="tabular text-[20px] font-bold text-ink-900">{formatGs(valorTotal)}</p>
            {sinCosto > 0 && <p className="text-[11.5px] text-ink-600">{sinCosto} producto(s) sin costo cargado, no suman acá.</p>}
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">Productos más vendidos</p>
            <p className="text-[13px] text-ink-600">Se completa solo cuando empieces a vender desde Caja.</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <thead className="bg-rose-50 text-[11px] uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-2.5">Producto</th>
              <th className="px-4 py-2.5 text-right">Stock</th>
              <th className="px-4 py-2.5 text-right">Costo</th>
              <th className="px-4 py-2.5 text-right">Venta</th>
              <th className="px-4 py-2.5 text-right">Margen</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink-900">{f.nombre}</p>
                  <p className="font-mono text-[11.5px] text-ink-600">{f.codigo_interno}</p>
                </td>
                <td className="tabular px-4 py-2.5 text-right">{f.stock}</td>
                <td className="tabular px-4 py-2.5 text-right text-ink-600">{f.costo !== null ? formatGs(f.costo) : "—"}</td>
                <td className="tabular px-4 py-2.5 text-right">{formatGs(f.precio_venta)}</td>
                <td className={cn("tabular px-4 py-2.5 text-right font-semibold", f.margen !== null && f.margen < 0 ? "text-alert" : "text-success")}>
                  {f.margen !== null ? `${formatGs(f.margen)} (${f.margenPct?.toFixed(0)}%)` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
