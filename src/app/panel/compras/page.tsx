import Link from "next/link";
import { Truck, Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatGs } from "@/lib/utils";
import type { Compra } from "@/lib/types/database";

export default async function ComprasPage() {
  await exigirUsuario();
  const supabase = await createClient();

  const { data } = await supabase
    .from("compras")
    .select("*, proveedores(nombre), almacenes(nombre)")
    .order("created_at", { ascending: false })
    .limit(100);
  const compras = (data ?? []) as Compra[];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">Compras</h1>
          <p className="text-[13px] text-ink-600">Cada compra suma stock e (si es a crédito) deuda con el proveedor</p>
        </div>
        <Button href="/panel/compras/nueva">
          <Plus size={18} /> Nueva compra
        </Button>
      </div>

      {compras.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Truck size={32} className="text-rose-300" />
          <p className="text-[14px] font-semibold text-ink-900">Todavía no registraste compras</p>
          <p className="max-w-xs text-[13px] text-ink-600">
            Necesitás al menos un proveedor, un almacén y artículos cargados.
          </p>
          <Button href="/panel/compras/nueva" className="mt-1">
            <Plus size={18} /> Nueva compra
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {compras.map((c) => (
          <Link
            key={c.id}
            href={`/panel/compras/${c.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                Nº {c.numero} · {c.proveedores?.nombre ?? "—"}
                {c.estado === "anulada" && <Badge tono="alerta">Anulada</Badge>}
              </p>
              <p className="text-[12.5px] text-ink-600">
                {new Date(c.created_at).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })}
                {" · "}
                {c.almacenes?.nombre} · {c.condicion === "credito" ? "a crédito" : "contado"}
              </p>
            </div>
            <span className="tabular shrink-0 text-[15px] font-bold text-ink-900">{formatGs(c.total)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
