import Link from "next/link";
import { Search, Factory, Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { formatGs } from "@/lib/utils";
import type { Proveedor } from "@/lib/types/database";

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirUsuario();
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("proveedores")
    .select("*")
    .is("deleted_at", null)
    .order("saldo", { ascending: false });
  if (q) query = query.or(`nombre.ilike.%${q}%,ruc.ilike.%${q}%,telefono.ilike.%${q}%`);

  const { data } = await query;
  const proveedores = (data ?? []) as Proveedor[];
  const conDeuda = proveedores.filter((p) => p.saldo > 0);
  const totalDeuda = conDeuda.reduce((acc, p) => acc + p.saldo, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Proveedores</h1>
          <p className="text-[13px] text-ink-600">
            {conDeuda.length} con saldo · {formatGs(totalDeuda)} por pagar
          </p>
        </div>
        <Button href="/panel/proveedores/nuevo">
          <Plus size={18} /> Nuevo
        </Button>
      </div>

      <form method="get" className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, RUC o teléfono…"
          className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3.5 text-[15px] focus:border-border-strong focus:outline-none"
        />
      </form>

      {proveedores.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Factory size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Todavía no hay proveedores</p>
          <Button href="/panel/proveedores/nuevo" className="mt-1">
            <Plus size={18} /> Crear proveedor
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {proveedores.map((p) => (
          <Link
            key={p.id}
            href={`/panel/proveedores/${p.id}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink-900">{p.nombre}</p>
              <p className="text-[12.5px] text-ink-600">
                {[p.ruc && `RUC ${p.ruc}`, p.telefono].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <span className={`tabular shrink-0 text-[16px] font-bold ${p.saldo > 0 ? "text-alert" : "text-ink-600"}`}>
              {formatGs(p.saldo)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
