import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProveedorForm } from "@/components/proveedores/ProveedorForm";
import { MovimientoProveedorForm } from "@/components/proveedores/MovimientoProveedorForm";
import { formatGs } from "@/lib/utils";
import type { Proveedor, ProveedorMovimiento } from "@/lib/types/database";

export default async function ProveedorDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirUsuario();
  const supabase = await createClient();

  const { data: proveedor } = await supabase.from("proveedores").select("*").eq("id", id).maybeSingle<Proveedor>();
  if (!proveedor) notFound();

  const { data: movimientos } = await supabase
    .from("proveedor_movimientos")
    .select("*")
    .eq("proveedor_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  const historial = (movimientos ?? []) as ProveedorMovimiento[];

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/panel/proveedores"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Proveedores
      </Link>

      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-ink-900">{proveedor.nombre}</h1>
          <p className="text-[13px] text-ink-600">
            {[proveedor.ruc && `RUC ${proveedor.ruc}`, proveedor.telefono].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <span className={`tabular shrink-0 text-[22px] font-bold ${proveedor.saldo > 0 ? "text-alert" : "text-success"}`}>
          {formatGs(proveedor.saldo)}
        </span>
      </div>
      {proveedor.descripcion && (
        <p className="mb-3 mt-2 rounded-lg bg-rose-50 p-2.5 text-[13px] text-ink-900">{proveedor.descripcion}</p>
      )}

      <div className="mt-3">
        <MovimientoProveedorForm proveedorId={proveedor.id} saldo={proveedor.saldo} />
      </div>

      <Card className="mt-4">
        <p className="mb-3 text-[14px] font-bold text-ink-900">Historial de cuenta</p>
        {historial.length === 0 && <p className="text-[13px] text-ink-600">Todavía no hay movimientos.</p>}
        <ul className="flex flex-col gap-2.5">
          {historial.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-[13.5px]">
              <div className="min-w-0">
                <span className={m.tipo === "deuda" ? "font-semibold text-alert" : "font-semibold text-success"}>
                  {m.tipo === "deuda" ? "Deuda" : "Pago"}
                </span>
                <span className="ml-2 text-ink-600">
                  {new Date(m.created_at).toLocaleDateString("es-PY", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
                {m.forma_pago && <span className="ml-1 text-ink-600">· {m.forma_pago}</span>}
                {m.notas && <span className="block truncate text-[12px] text-ink-600">{m.notas}</span>}
              </div>
              <span className="tabular shrink-0 font-semibold text-ink-900">
                {m.tipo === "deuda" ? "+" : "-"}
                {formatGs(m.monto)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <p className="mb-3 text-[14px] font-bold text-ink-900">Datos del proveedor</p>
        <ProveedorForm proveedor={proveedor} />
      </Card>
    </div>
  );
}
