import Link from "next/link";
import { Search, Users, Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { formatGs } from "@/lib/utils";
import type { Cliente } from "@/lib/types/database";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("clientes").select("*").is("deleted_at", null).order("nombre");
  if (q) query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,documento.ilike.%${q}%`);
  const { data } = await query;
  const clientes = (data ?? []) as Cliente[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Clientes</h1>
          <p className="text-[13px] text-ink-600">{clientes.length} cliente{clientes.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/panel/clientes/nuevo">
          <Plus size={18} /> Nuevo
        </Button>
      </div>

      <form method="get" className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, teléfono o documento…"
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
        />
      </form>

      {clientes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Users size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Todavía no hay clientes</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Se pueden crear acá o al vuelo desde la Caja al cargar una venta a la cuenta.
          </p>
          <Button href="/panel/clientes/nuevo" className="mt-1">
            <Plus size={18} /> Crear cliente
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {clientes.map((c) => (
          <Link
            key={c.id}
            href={`/panel/clientes/${c.id}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink-900">{c.nombre}</p>
              <p className="text-[12.5px] text-ink-600">{[c.telefono, c.documento].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            {c.saldo_actual > 0 && (
              <span className="tabular shrink-0 text-[14px] font-bold text-alert">{formatGs(c.saldo_actual)}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
