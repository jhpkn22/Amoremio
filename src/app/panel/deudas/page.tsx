import Link from "next/link";
import { Search, Wallet } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatGs } from "@/lib/utils";
import type { Cliente } from "@/lib/types/database";

export default async function DeudasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("clientes").select("*").is("deleted_at", null).order("saldo_actual", { ascending: false });
  if (q) query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%`);

  const { data } = await query;
  const clientes = (data ?? []) as Cliente[];
  const conDeuda = clientes.filter((c) => c.saldo_actual > 0);
  const totalDeuda = conDeuda.reduce((acc, c) => acc + c.saldo_actual, 0);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-ink-900">Deudas de clientes</h1>
        <p className="text-[13px] text-ink-600">
          {conDeuda.length} cliente{conDeuda.length === 1 ? "" : "s"} con saldo · {formatGs(totalDeuda)} total
        </p>
      </div>

      <form method="get" className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar cliente por nombre o teléfono…"
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
        />
      </form>

      {clientes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Wallet size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">No hay clientes cargados todavía</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Los clientes se crean directamente desde la Caja al elegir &quot;Fiado&quot; en una venta.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {clientes.map((c) => (
          <Link
            key={c.id}
            href={`/panel/deudas/${c.id}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink-900">{c.nombre}</p>
              {c.telefono && <p className="text-[12.5px] text-ink-600">{c.telefono}</p>}
            </div>
            <span className={`tabular shrink-0 text-[16px] font-bold ${c.saldo_actual > 0 ? "text-alert" : "text-ink-600"}`}>
              {formatGs(c.saldo_actual)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
