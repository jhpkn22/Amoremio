import Link from "next/link";
import { Search, Boxes, Warehouse } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { TablaStock, type FilaStock } from "@/components/stock/TablaStock";
import { cn } from "@/lib/utils";
import type { Almacen } from "@/lib/types/database";

interface ArticuloConStock {
  id: string;
  nombre: string;
  codigo_interno: string;
  stock_minimo: number;
  articulo_stock: { almacen_id: string; cantidad: number }[] | null;
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ almacen?: string; q?: string; faltante?: string }>;
}) {
  await exigirUsuario();
  const { almacen, q, faltante } = await searchParams;
  const supabase = await createClient();

  const { data: almacenesData } = await supabase
    .from("almacenes")
    .select("*")
    .is("deleted_at", null)
    .order("es_principal", { ascending: false })
    .order("nombre");
  const almacenes = (almacenesData ?? []) as Almacen[];

  if (almacenes.length === 0) {
    return (
      <div>
        <h1 className="mb-1 text-[22px] font-bold text-ink-900">Stock</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Warehouse size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Primero creá un almacén</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            El stock vive en almacenes. Después ingresa por Compras.
          </p>
          <Button href="/panel/stock/almacenes" className="mt-1">
            Crear almacén
          </Button>
        </div>
      </div>
    );
  }

  const almacenSel = almacenes.find((a) => a.id === almacen) ?? almacenes[0];

  let query = supabase
    .from("articulos")
    .select("id, nombre, codigo_interno, stock_minimo, articulo_stock(almacen_id, cantidad)")
    .is("deleted_at", null)
    .order("nombre");
  if (q) query = query.or(`nombre.ilike.%${q}%,codigo_interno.ilike.%${q}%,codigo_barras.ilike.%${q}%`);

  const { data } = await query.returns<ArticuloConStock[]>();

  let filas: FilaStock[] = (data ?? []).map((a) => {
    const porAlmacen = a.articulo_stock ?? [];
    const enAlmacen = porAlmacen.find((s) => s.almacen_id === almacenSel.id)?.cantidad ?? 0;
    const total = porAlmacen.reduce((acc, s) => acc + s.cantidad, 0);
    return {
      id: a.id,
      nombre: a.nombre,
      codigo_interno: a.codigo_interno,
      stock_minimo: a.stock_minimo,
      enAlmacen,
      total,
    };
  });

  if (faltante === "1") filas = filas.filter((f) => f.enAlmacen <= f.stock_minimo);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Stock</h1>
          <p className="text-[13px] text-ink-600">{filas.length} artículo{filas.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/panel/stock/almacenes" variante="fantasma">
          <Warehouse size={16} /> Almacenes
        </Button>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {almacenes.map((a) => (
          <Link
            key={a.id}
            href={`/panel/stock?almacen=${a.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${faltante === "1" ? "&faltante=1" : ""}`}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold",
              a.id === almacenSel.id
                ? "border-border-strong bg-rose-600 text-ink-900"
                : "border-border bg-surface text-ink-600"
            )}
          >
            <Boxes size={14} /> {a.nombre}
            {a.es_principal && <span className="text-[10px] opacity-70">principal</span>}
          </Link>
        ))}
      </div>

      <form method="get" className="relative mb-2">
        <input type="hidden" name="almacen" value={almacenSel.id} />
        {faltante === "1" && <input type="hidden" name="faltante" value="1" />}
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar artículo por nombre o código…"
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
        />
      </form>

      <div className="mb-4">
        <Link
          href={`/panel/stock?almacen=${almacenSel.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${faltante === "1" ? "" : "&faltante=1"}`}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold",
            faltante === "1" ? "border-alert bg-alert-soft text-alert" : "border-border bg-surface text-ink-600"
          )}
        >
          Solo con faltante
        </Link>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-[13px] text-ink-600">
          {q ? "Ningún artículo coincide." : "Sin artículos con stock todavía — ingresá mercadería por Compras."}
        </p>
      ) : (
        <TablaStock filas={filas} almacenId={almacenSel.id} almacenes={almacenes} />
      )}
    </div>
  );
}
