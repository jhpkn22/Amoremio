import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReimprimirBoton } from "@/components/caja/ReimprimirBoton";
import { AnularVentaBoton } from "@/components/caja/AnularVentaBoton";
import { formatGs } from "@/lib/utils";
import type { Venta, VentaItem } from "@/lib/types/database";

const ETIQUETAS_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  qr: "QR",
  fiado: "Fiado",
};

export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: venta } = await supabase
    .from("ventas")
    .select("*, usuarios(nombre), clientes(id, nombre, telefono)")
    .eq("id", id)
    .maybeSingle<Venta>();

  if (!venta) notFound();

  const { data: items } = await supabase
    .from("venta_items")
    .select("*")
    .eq("venta_id", id)
    .order("id");

  const ventaItems = (items ?? []) as VentaItem[];

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/panel/caja/ventas" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver a ventas
      </Link>

      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-[20px] font-bold text-ink-900">Ticket Nº {String(venta.numero_ticket).padStart(6, "0")}</h1>
        <Badge tono={venta.estado === "anulada" ? "alerta" : "exito"}>{venta.estado === "anulada" ? "Anulada" : "Confirmada"}</Badge>
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex flex-col gap-1 border-b border-border pb-3 text-[13px] text-ink-600">
          <span>{new Date(venta.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}</span>
          <span>
            Vendedor/a: {venta.usuarios?.nombre} · {ETIQUETAS_PAGO[venta.forma_pago] ?? venta.forma_pago}
            {venta.creada_offline && " · cargada offline"}
          </span>
          {venta.clientes?.nombre && <span>Cliente: {venta.clientes.nombre}</span>}
        </div>

        <ul className="flex flex-col gap-2">
          {ventaItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-[13.5px]">
              <span className="text-ink-900">
                {item.cantidad} x {item.nombre_producto}
              </span>
              <span className="tabular font-semibold text-ink-900">{formatGs(item.subtotal_item)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-[13.5px]">
          <div className="flex items-center justify-between text-ink-600">
            <span>Subtotal</span>
            <span className="tabular">{formatGs(venta.subtotal)}</span>
          </div>
          {venta.descuento_total > 0 && (
            <div className="flex items-center justify-between text-ink-600">
              <span>Descuento</span>
              <span className="tabular">-{formatGs(venta.descuento_total)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[16px] font-bold text-ink-900">
            <span>Total</span>
            <span className="tabular">{formatGs(venta.total)}</span>
          </div>
          {venta.forma_pago === "efectivo" && venta.efectivo_recibido != null && (
            <>
              <div className="flex items-center justify-between text-ink-600">
                <span>Recibido</span>
                <span className="tabular">{formatGs(venta.efectivo_recibido)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-600">
                <span>Vuelto</span>
                <span className="tabular">{formatGs(venta.vuelto)}</span>
              </div>
            </>
          )}
        </div>

        {venta.estado === "anulada" && (
          <p className="mt-3 rounded-lg bg-alert-soft p-2.5 text-[12.5px] text-alert">Motivo de anulación: {venta.anulada_motivo}</p>
        )}
      </Card>

      <div className="flex flex-wrap items-start gap-2">
        <ReimprimirBoton venta={venta} items={ventaItems} vendedorNombre={venta.usuarios?.nombre ?? ""} />
        {usuario.rol === "admin" && venta.estado === "confirmada" && <AnularVentaBoton ventaId={venta.id} />}
      </div>
    </div>
  );
}
