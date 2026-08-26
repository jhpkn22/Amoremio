import Link from "next/link";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { formatGs } from "@/lib/utils";
import type { Venta } from "@/lib/types/database";

const ETIQUETAS_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transfer.",
  qr: "QR",
  fiado: "Fiado",
};

function sumarDias(fechaISO: string, dias: number): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await exigirUsuario();
  const { fecha } = await searchParams;
  const fechaISO = fecha ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const inicio = new Date(`${fechaISO}T00:00:00`).toISOString();
  const fin = new Date(`${sumarDias(fechaISO, 1)}T00:00:00`).toISOString();

  const { data } = await supabase
    .from("ventas")
    .select("*, usuarios(nombre), clientes(id, nombre, telefono)")
    .gte("created_at", inicio)
    .lt("created_at", fin)
    .order("created_at", { ascending: false });

  const ventas = (data ?? []) as Venta[];
  const totalDia = ventas.filter((v) => v.estado === "confirmada").reduce((acc, v) => acc + v.total, 0);
  const esHoy = fechaISO === new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Ventas</h1>
          <p className="text-[13px] text-ink-600">
            {ventas.length} venta{ventas.length === 1 ? "" : "s"} · {formatGs(totalDia)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/panel/caja/ventas?fecha=${sumarDias(fechaISO, -1)}`}
            className="rounded-lg border border-border p-2 text-ink-600 hover:bg-rose-50"
            aria-label="Día anterior"
          >
            <ChevronLeft size={18} />
          </Link>
          <span className="min-w-24 text-center text-[13.5px] font-semibold text-ink-900">
            {new Date(`${fechaISO}T12:00:00`).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
          {!esHoy && (
            <Link
              href={`/panel/caja/ventas?fecha=${sumarDias(fechaISO, 1)}`}
              className="rounded-lg border border-border p-2 text-ink-600 hover:bg-rose-50"
              aria-label="Día siguiente"
            >
              <ChevronRight size={18} />
            </Link>
          )}
        </div>
      </div>

      {ventas.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Receipt size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">No hay ventas ese día</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {ventas.map((v) => (
          <Link
            key={v.id}
            href={`/panel/caja/ventas/${v.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-ink-600">
                  #{String(v.numero_ticket).padStart(6, "0")}
                </span>
                <Badge tono={v.estado === "anulada" ? "alerta" : "neutral"}>
                  {v.estado === "anulada" ? "Anulada" : ETIQUETAS_PAGO[v.forma_pago] ?? v.forma_pago}
                </Badge>
                {v.creada_offline && <Badge tono="marca">offline</Badge>}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-ink-600">
                {new Date(v.created_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} · {v.usuarios?.nombre}
                {v.clientes?.nombre ? ` · ${v.clientes.nombre}` : ""}
              </p>
            </div>
            <span className={`tabular shrink-0 text-[16px] font-bold ${v.estado === "anulada" ? "text-ink-600 line-through" : "text-ink-900"}`}>
              {formatGs(v.total)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
