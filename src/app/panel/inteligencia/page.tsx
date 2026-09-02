import { Sparkles, TrendingDown, Clock, PiggyBank } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { TablaInteligencia, type FilaInteligencia } from "@/components/inteligencia/TablaInteligencia";
import { BarrasHorizontal } from "@/components/graficos/BarrasHorizontal";
import { formatGs } from "@/lib/utils";

const DIA_MS = 86_400_000;

function bucketPct(dias: number): 0 | 10 | 15 | 20 | 25 {
  if (dias >= 730) return 25;
  if (dias >= 365) return 20;
  if (dias >= 180) return 15;
  if (dias >= 90) return 10;
  return 0;
}

export default async function InteligenciaPage() {
  await exigirUsuario({ soloAdmin: true });
  const supabase = await createClient();
  // Server Component async: leer la hora acá es una consulta de datos, no un cálculo de render.
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();
  const hace90 = new Date(ahora - 90 * DIA_MS).toISOString();

  interface ArtRow {
    id: string;
    nombre: string;
    codigo_interno: string;
    precio_venta: number;
    precio_lista: number | null;
    descuento_pct: number;
    created_at: string;
    articulo_costos: { precio_costo: number } | null;
    articulo_stock: { cantidad: number }[] | null;
  }

  const [{ data: articulos }, { data: compras }, { data: ventaItems }] = await Promise.all([
    supabase
      .from("articulos")
      .select(
        "id, nombre, codigo_interno, precio_venta, precio_lista, descuento_pct, created_at, articulo_costos(precio_costo), articulo_stock(cantidad)"
      )
      .is("deleted_at", null)
      .eq("activo", true)
      .returns<ArtRow[]>(),
    supabase.from("stock_movimientos").select("articulo_id, created_at").eq("tipo", "compra"),
    supabase
      .from("venta_items")
      .select("articulo_id, cantidad, ventas!inner(created_at, estado)")
      .eq("ventas.estado", "confirmada")
      .gte("ventas.created_at", hace90)
      .returns<{ articulo_id: string | null; cantidad: number }[]>(),
  ]);

  const primeraCompra = new Map<string, number>();
  for (const m of compras ?? []) {
    const t = new Date(m.created_at as string).getTime();
    const actual = primeraCompra.get(m.articulo_id as string);
    if (actual === undefined || t < actual) primeraCompra.set(m.articulo_id as string, t);
  }

  const vendido90 = new Map<string, number>();
  for (const vi of ventaItems ?? []) {
    if (!vi.articulo_id) continue;
    vendido90.set(vi.articulo_id, (vendido90.get(vi.articulo_id) ?? 0) + vi.cantidad);
  }

  const filas: FilaInteligencia[] = (articulos ?? [])
    .map((a) => {
      const desde = primeraCompra.get(a.id) ?? new Date(a.created_at).getTime();
      const dias = Math.floor((ahora - desde) / DIA_MS);
      const pct = bucketPct(dias);
      const stock = (a.articulo_stock ?? []).reduce((acc, s) => acc + s.cantidad, 0);
      const costo = a.articulo_costos?.precio_costo ?? null;
      const lista = a.precio_lista ?? a.precio_venta;
      const sugerido = pct > 0 ? Math.round((lista * (100 - pct)) / 100) : a.precio_venta;
      const margenGs = costo !== null ? a.precio_venta - costo : null;
      const margenPct =
        margenGs !== null && a.precio_venta > 0 ? Math.round((margenGs / a.precio_venta) * 100) : null;
      return {
        id: a.id,
        nombre: a.nombre,
        codigo_interno: a.codigo_interno,
        dias,
        pct,
        stock,
        capital: costo !== null ? stock * costo : 0,
        precio_actual: a.precio_venta,
        precio_lista: lista,
        precio_sugerido: sugerido,
        descuento_pct: a.descuento_pct,
        vendido_90: vendido90.get(a.id) ?? 0,
        margen_gs: margenGs,
        margen_pct: margenPct,
      };
    })
    .sort((x, y) => y.dias - x.dias);

  const conStock = filas.filter((f) => f.stock > 0);
  const capitalMas6 = conStock.filter((f) => f.dias >= 180).reduce((acc, f) => acc + f.capital, 0);
  const masAntiguo = conStock[0];
  const ahorroPotencial = filas
    .filter((f) => f.pct > 0 && f.descuento_pct === 0)
    .reduce((acc, f) => acc + f.stock * (f.precio_actual - f.precio_sugerido), 0);

  const lentaRotacion = conStock
    .filter((f) => f.stock >= 3)
    .map((f) => ({
      etiqueta: f.nombre,
      valor: f.stock,
      sub: `${f.vendido_90} vendidas en 90 días · ${f.dias} días en stock`,
      ratio: f.vendido_90 / f.stock,
    }))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 30);

  // Los que más rotan / más se venden (unidades vendidas en 90 días)
  const masRotacion = filas
    .filter((f) => f.vendido_90 > 0)
    .map((f) => ({
      etiqueta: f.nombre,
      valor: f.vendido_90,
      sub:
        f.stock > 0
          ? `${f.stock} en stock · ${(f.vendido_90 / f.stock).toFixed(1)} rotaciones en 90 días`
          : `sin stock — se agotó`,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 30);

  // Los que mejor combinan ventas y margen (score 50% ventas + 50% margen %)
  const candidatos = filas.filter((f) => f.vendido_90 > 0 && f.margen_pct !== null);
  const maxVend = Math.max(1, ...candidatos.map((f) => f.vendido_90));
  const maxMg = Math.max(1, ...candidatos.map((f) => f.margen_pct as number));
  const mejoresProductos = candidatos
    .map((f) => ({
      etiqueta: f.nombre,
      valor: f.margen_pct as number,
      sub: `${f.vendido_90} vendidas · ${(f.margen_gs ?? 0).toLocaleString("es-PY")} Gs. de ganancia por unidad`,
      score: (f.vendido_90 / maxVend) * 0.5 + ((f.margen_pct as number) / maxMg) * 0.5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={20} className="text-rose-600" />
        <h1 className="text-[22px] font-bold text-ink-900">Inteligencia</h1>
      </div>
      <p className="mb-5 text-[13px] text-ink-600">
        Artículos ordenados por antigüedad en stock, con el descuento sugerido según cuánto llevan sin rotar.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3">
          <PiggyBank size={20} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Capital parado &gt; 6 meses</p>
            <p className="tabular text-[18px] font-bold text-ink-900">{formatGs(capitalMas6)}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <Clock size={20} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Más antiguo con stock</p>
            <p className="text-[14px] font-bold text-ink-900">{masAntiguo ? masAntiguo.nombre : "—"}</p>
            {masAntiguo && <p className="text-[12px] text-ink-600">{masAntiguo.dias} días · {masAntiguo.stock} u.</p>}
          </div>
        </Card>
        <Card className="flex items-start gap-3">
          <TrendingDown size={20} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">Rebaja si aplicás todo</p>
            <p className="tabular text-[18px] font-bold text-ink-900">{formatGs(ahorroPotencial)}</p>
            <p className="text-[12px] text-ink-600">menos de ingreso, para mover stock frenado</p>
          </div>
        </Card>
      </div>

      <TablaInteligencia filas={filas} />

      <div className="mt-6 space-y-5">
        <Card>
          <p className="mb-1 text-[14px] font-bold text-ink-900">Los que menos rotan</p>
          <p className="mb-3 text-[13px] text-ink-600">
            Hasta 30 artículos ordenados por menor rotación (stock alto vs. ventas de los últimos 90 días).
            Candidatos a promo, combo o a frenar la recompra.
          </p>
          <BarrasHorizontal datos={lentaRotacion} formato={(n) => `${n} en stock`} />
        </Card>

        <Card>
          <p className="mb-1 text-[14px] font-bold text-ink-900">Los que más rotan y se venden</p>
          <p className="mb-3 text-[13px] text-ink-600">
            Hasta 30 artículos con más unidades vendidas en los últimos 90 días. Son los que conviene tener
            siempre en stock.
          </p>
          <BarrasHorizontal datos={masRotacion} formato={(n) => `${n} vendidas`} />
        </Card>

        <Card>
          <p className="mb-1 text-[14px] font-bold text-ink-900">Mejores productos (ventas + margen)</p>
          <p className="mb-3 text-[13px] text-ink-600">
            Combina cuánto se vende con qué % de ganancia deja (mitad y mitad). Los de arriba son los que más
            plata te dejan sin esforzarte en venderlos.
          </p>
          <BarrasHorizontal datos={mejoresProductos} formato={(n) => `${n}% margen`} />
        </Card>
      </div>
    </div>
  );
}
