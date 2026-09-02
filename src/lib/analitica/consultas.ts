import { createClient } from "@/lib/supabase/server";

// Paraguay: UTC-3 fijo (sin horario de verano desde 2024).
const OFFSET_PY_MS = 3 * 60 * 60 * 1000;

function enPY(iso: string): Date {
  return new Date(new Date(iso).getTime() - OFFSET_PY_MS);
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export interface DatosAnalitica {
  totalVentas: number;
  cantVentas: number;
  ticketPromedio: number;
  gananciaTotal: number;
  itemsSinCosto: number;
  porMes: { etiqueta: string; valor: number }[];
  porMesGanancia: { etiqueta: string; valor: number }[];
  porDiaSemana: { etiqueta: string; valor: number; destacado?: boolean }[];
  porHora: { etiqueta: string; valor: number; destacado?: boolean }[];
  ultimos30: { etiqueta: string; valor: number }[];
  heatmap: number[][]; // [diaLun0..Dom6][hora0..23] = cant ventas
  topUnidades: { etiqueta: string; valor: number; sub?: string }[];
  topImporte: { etiqueta: string; valor: number }[];
  topMargen: { etiqueta: string; valor: number; sub?: string }[];
  diaPico: string | null;
  horaPico: string | null;
  productoEstrella: string | null;
  mejorMargen: string | null;
}

export async function cargarAnalitica(): Promise<DatosAnalitica> {
  const supabase = await createClient();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - 12);

  const { data: ventas } = await supabase
    .from("ventas")
    .select("id, total, created_at")
    .eq("estado", "confirmada")
    .gte("created_at", desde.toISOString())
    .returns<{ id: string; total: number; created_at: string }[]>();

  const { data: items } = await supabase
    .from("venta_items")
    .select("nombre_producto, cantidad, subtotal_item, precio_unitario, articulo_id, ventas!inner(estado, created_at), venta_item_costos(costo_unitario)")
    .eq("ventas.estado", "confirmada")
    .gte("ventas.created_at", desde.toISOString())
    .returns<
      {
        nombre_producto: string;
        cantidad: number;
        subtotal_item: number;
        precio_unitario: number;
        articulo_id: string | null;
        ventas: { created_at: string } | null;
        venta_item_costos: { costo_unitario: number } | null;
      }[]
    >();

  const vs = ventas ?? [];
  const its = items ?? [];

  const totalVentas = vs.reduce((a, v) => a + v.total, 0);
  const cantVentas = vs.length;

  // por mes (últimos 12)
  const mapaMes = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    mapaMes.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const v of vs) {
    const d = enPY(v.created_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (mapaMes.has(k)) mapaMes.set(k, (mapaMes.get(k) ?? 0) + v.total);
  }
  const porMes = [...mapaMes.entries()].map(([k, valor]) => {
    const [, m] = k.split("-").map(Number);
    return { etiqueta: MESES[m], valor };
  });

  // ganancia (venta − costo) por mes, desde los items con costo snapshot
  const mapaGananciaMes = new Map<string, number>([...mapaMes.keys()].map((k) => [k, 0]));
  let gananciaTotal = 0;
  let itemsSinCosto = 0;
  for (const it of its) {
    const costo = it.venta_item_costos?.costo_unitario;
    if (costo == null) {
      itemsSinCosto++;
      continue;
    }
    const margen = (it.precio_unitario - costo) * it.cantidad;
    gananciaTotal += margen;
    if (it.ventas?.created_at) {
      const d = enPY(it.ventas.created_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (mapaGananciaMes.has(k)) mapaGananciaMes.set(k, (mapaGananciaMes.get(k) ?? 0) + margen);
    }
  }
  const porMesGanancia = [...mapaGananciaMes.entries()].map(([k, valor]) => {
    const [, m] = k.split("-").map(Number);
    return { etiqueta: MESES[m], valor };
  });

  // por día de la semana (Lun..Dom) — cantidad de ventas
  const semana = new Array(7).fill(0); // idx 0 = Lunes
  const horas = new Array(24).fill(0);
  const heat: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const v of vs) {
    const d = enPY(v.created_at);
    const diaLun = (d.getDay() + 6) % 7; // 0 = Lunes
    semana[diaLun]++;
    horas[d.getHours()]++;
    heat[diaLun][d.getHours()]++;
  }
  const maxSemana = Math.max(...semana);
  const porDiaSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((etq, i) => ({
    etiqueta: etq,
    valor: semana[i],
    destacado: semana[i] === maxSemana && maxSemana > 0,
  }));
  const maxHora = Math.max(...horas);
  const porHora = horas
    .map((valor, h) => ({ etiqueta: `${h}`, valor, destacado: valor === maxHora && maxHora > 0 }))
    .filter((_, h) => h >= 7 && h <= 22); // franja comercial

  // últimos 30 días
  const mapa30 = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    mapa30.set(d.toISOString().slice(0, 10), 0);
  }
  for (const v of vs) {
    const k = enPY(v.created_at).toISOString().slice(0, 10);
    if (mapa30.has(k)) mapa30.set(k, (mapa30.get(k) ?? 0) + v.total);
  }
  const ultimos30 = [...mapa30.entries()].map(([k, valor]) => ({ etiqueta: k.slice(8) + "/" + k.slice(5, 7), valor }));

  // rankings de productos
  const porNombre = new Map<string, { u: number; imp: number; margenAcum: number; margenBase: number }>();
  for (const it of its) {
    const cur = porNombre.get(it.nombre_producto) ?? { u: 0, imp: 0, margenAcum: 0, margenBase: 0 };
    cur.u += it.cantidad;
    cur.imp += it.subtotal_item;
    const costo = it.venta_item_costos?.costo_unitario;
    if (costo != null) {
      cur.margenAcum += (it.precio_unitario - costo) * it.cantidad;
      cur.margenBase += it.precio_unitario * it.cantidad;
    }
    porNombre.set(it.nombre_producto, cur);
  }
  const filas = [...porNombre.entries()];
  const topUnidades = filas
    .sort((a, b) => b[1].u - a[1].u)
    .slice(0, 6)
    .map(([n, d]) => ({ etiqueta: n, valor: d.u, sub: `${d.imp.toLocaleString("es-PY")} Gs.` }));
  const topImporte = filas
    .sort((a, b) => b[1].imp - a[1].imp)
    .slice(0, 6)
    .map(([n, d]) => ({ etiqueta: n, valor: d.imp }));
  const topMargen = filas
    .filter(([, d]) => d.margenBase > 0)
    .map(([n, d]) => ({ etiqueta: n, valor: Math.round((d.margenAcum / d.margenBase) * 100), sub: `${d.margenAcum.toLocaleString("es-PY")} Gs. de ganancia` }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  const idxDiaPico = semana.indexOf(Math.max(...semana));
  const idxHoraPico = horas.indexOf(Math.max(...horas));

  return {
    totalVentas,
    cantVentas,
    ticketPromedio: cantVentas ? Math.round(totalVentas / cantVentas) : 0,
    gananciaTotal,
    itemsSinCosto,
    porMes,
    porMesGanancia,
    porDiaSemana,
    porHora,
    ultimos30,
    heatmap: heat,
    topUnidades,
    topImporte,
    topMargen,
    diaPico: maxSemana > 0 ? ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"][idxDiaPico] : null,
    horaPico: Math.max(...horas) > 0 ? `${idxHoraPico}:00–${idxHoraPico + 1}:00` : null,
    productoEstrella: topUnidades[0]?.etiqueta ?? null,
    mejorMargen: topMargen[0]?.etiqueta ?? null,
  };
}

export { DIAS_SEMANA };
