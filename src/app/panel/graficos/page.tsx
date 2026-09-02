import { LineChart, TrendingUp } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { cargarAnalitica } from "@/lib/analitica/consultas";
import { Card } from "@/components/ui/Card";
import { BarrasVertical } from "@/components/graficos/BarrasVertical";
import { BarrasHorizontal } from "@/components/graficos/BarrasHorizontal";
import { HeatmapHoras } from "@/components/graficos/HeatmapHoras";
import { formatGs } from "@/lib/utils";

function gsCorto(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

export default async function GraficosPage() {
  await exigirUsuario({ soloAdmin: true });
  const a = await cargarAnalitica();

  const sinDatos = a.cantVentas === 0;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <LineChart size={20} className="text-rose-600" />
        <h1 className="text-[22px] font-bold text-ink-900">Gráficos</h1>
      </div>
      <p className="mb-5 text-[13px] text-ink-600">Cómo vienen las ventas — últimos 12 meses.</p>

      {sinDatos ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <TrendingUp size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Todavía no hay ventas para graficar</p>
          <p className="max-w-xs text-[13px] text-ink-600">Se completa solo a medida que vendas desde la Caja.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Vendido en bruto (12m)</p>
              <p className="tabular text-[18px] font-bold text-ink-900">{formatGs(a.totalVentas)}</p>
            </Card>
            <Card>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Ganancia (venta − costo)</p>
              <p className="tabular text-[18px] font-bold text-success">{formatGs(a.gananciaTotal)}</p>
              <p className="text-[11px] text-ink-600">
                {a.totalVentas > 0 ? `${Math.round((a.gananciaTotal / a.totalVentas) * 100)}% de margen` : ""}
              </p>
            </Card>
            <Card>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Ventas</p>
              <p className="tabular text-[18px] font-bold text-ink-900">{a.cantVentas}</p>
            </Card>
            <Card>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Ticket promedio</p>
              <p className="tabular text-[18px] font-bold text-ink-900">{formatGs(a.ticketPromedio)}</p>
            </Card>
          </div>

          <Card className="mb-4 rounded-xl bg-rose-50/60 text-[13px] text-ink-900">
            <span className="font-semibold">Lectura rápida: </span>
            {a.diaPico && <>el día de mayor movimiento son los <b>{a.diaPico}</b>. </>}
            {a.horaPico && <>La franja pico es <b>{a.horaPico}</b>. </>}
            {a.productoEstrella && <>El producto que más sale es <b>{a.productoEstrella}</b>. </>}
            {a.mejorMargen && <>El de mejor % de ganancia es <b>{a.mejorMargen}</b>.</>}
          </Card>

          <div className="space-y-5">
            <Card>
              <p className="mb-3 text-[14px] font-bold text-ink-900">Vendido en bruto por mes</p>
              <BarrasVertical datos={a.porMes} formato={gsCorto} alto={200} />
            </Card>

            <Card>
              <p className="mb-1 text-[14px] font-bold text-ink-900">Ganancia por mes (venta − costo)</p>
              <p className="mb-3 text-[12.5px] text-ink-600">
                Diferencia entre el precio de venta y el costo de cada artículo vendido.
                {a.itemsSinCosto > 0 && ` ${a.itemsSinCosto} ítem(s) sin costo cargado no suman acá.`}
              </p>
              <BarrasVertical datos={a.porMesGanancia} formato={gsCorto} alto={200} />
            </Card>

            <Card>
              <p className="mb-3 text-[14px] font-bold text-ink-900">Últimos 30 días</p>
              <BarrasVertical datos={a.ultimos30} formato={gsCorto} alto={170} />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <p className="mb-3 text-[14px] font-bold text-ink-900">Ventas por día de la semana</p>
                <BarrasVertical datos={a.porDiaSemana} formato={(n) => `${n}`} />
              </Card>
              <Card>
                <p className="mb-3 text-[14px] font-bold text-ink-900">Ventas por hora</p>
                <BarrasVertical datos={a.porHora} formato={(n) => `${n}`} />
              </Card>
            </div>

            <Card>
              <p className="mb-1 text-[14px] font-bold text-ink-900">Movimiento por día y hora</p>
              <p className="mb-3 text-[12.5px] text-ink-600">Más oscuro = más ventas.</p>
              <HeatmapHoras matriz={a.heatmap} />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <p className="mb-3 text-[14px] font-bold text-ink-900">Más vendidos (unidades)</p>
                <BarrasHorizontal datos={a.topUnidades} formato={(n) => `${n} u.`} />
              </Card>
              <Card>
                <p className="mb-3 text-[14px] font-bold text-ink-900">Más vendidos (importe)</p>
                <BarrasHorizontal datos={a.topImporte} formato={formatGs} />
              </Card>
            </div>

            <Card>
              <p className="mb-3 text-[14px] font-bold text-ink-900">Mejor % de ganancia</p>
              <BarrasHorizontal datos={a.topMargen} formato={(n) => `${n}%`} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
