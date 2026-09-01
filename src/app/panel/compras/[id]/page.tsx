import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AnularCompraBoton } from "@/components/compras/AnularCompraBoton";
import { formatGs } from "@/lib/utils";
import type { Compra } from "@/lib/types/database";

export default async function CompraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data } = await supabase
    .from("compras")
    .select("*, proveedores(nombre), almacenes(nombre), compra_items(*, articulos(nombre, codigo_interno))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const c = data as Compra;
  const items = c.compra_items ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/panel/compras"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Compras
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink-900">
            Compra Nº {c.numero}
            {c.estado === "anulada" && <Badge tono="alerta">Anulada</Badge>}
          </h1>
          <p className="text-[13px] text-ink-600">
            {new Date(c.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })} ·{" "}
            {c.proveedores?.nombre} · {c.almacenes?.nombre} ·{" "}
            {c.condicion === "credito" ? "a crédito" : "contado"}
          </p>
        </div>
        {c.estado === "confirmada" && usuario.rol === "admin" && <AnularCompraBoton compraId={c.id} />}
      </div>

      {c.estado === "anulada" && c.anulada_motivo && (
        <p className="mb-4 rounded-xl border border-alert bg-alert-soft p-3 text-[13px] text-alert">
          Anulada: {c.anulada_motivo}
        </p>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[480px] text-left text-[13.5px]">
          <thead className="bg-rose-50 text-[11px] uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-2.5">Artículo</th>
              <th className="px-4 py-2.5 text-right">Cant.</th>
              <th className="px-4 py-2.5 text-right">Costo unit.</th>
              <th className="px-4 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-ink-900">{it.articulos?.nombre ?? "—"}</p>
                  <p className="font-mono text-[11.5px] text-ink-600">{it.articulos?.codigo_interno}</p>
                  {it.precio_venta_nuevo != null && (
                    <p className="text-[11.5px] text-ink-600">
                      Precio de venta actualizado a {formatGs(it.precio_venta_nuevo)}
                    </p>
                  )}
                </td>
                <td className="tabular px-4 py-2.5 text-right">{it.cantidad}</td>
                <td className="tabular px-4 py-2.5 text-right text-ink-600">{formatGs(it.costo_unitario)}</td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">
                  {formatGs(it.cantidad * it.costo_unitario)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="px-4 py-3 text-[15px] font-bold text-ink-900" colSpan={3}>
                TOTAL
              </td>
              <td className="tabular px-4 py-3 text-right text-[16px] font-bold text-rose-700">{formatGs(c.total)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
