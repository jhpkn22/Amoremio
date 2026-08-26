import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { RegistrarPagoForm } from "@/components/cuentas/RegistrarPagoForm";
import { linkWhatsApp } from "@/lib/whatsapp";
import { formatGs } from "@/lib/utils";
import type { Cliente, CuentaMovimiento } from "@/lib/types/database";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirUsuario();
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle<Cliente>();
  if (!cliente) notFound();

  const { data: movimientos } = await supabase
    .from("cuenta_movimientos")
    .select("*")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const historial = (movimientos ?? []) as CuentaMovimiento[];

  const mensaje = `Hola ${cliente.nombre}, te escribimos de Amore Mío. Tenés un saldo pendiente de ${formatGs(
    cliente.saldo_actual
  )}. Cualquier consulta, contanos por acá.`;
  const hrefWhatsApp = cliente.telefono ? linkWhatsApp(cliente.telefono, mensaje) : null;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/panel/cuentas" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver a cuentas
      </Link>

      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-ink-900">{cliente.nombre}</h1>
          {cliente.telefono && <p className="text-[13px] text-ink-600">{cliente.telefono}</p>}
        </div>
        <span className={`tabular shrink-0 text-[22px] font-bold ${cliente.saldo_actual > 0 ? "text-alert" : "text-success"}`}>
          {formatGs(cliente.saldo_actual)}
        </span>
      </div>

      {cliente.limite_credito != null && (
        <p className="mb-1 text-[12.5px] text-ink-600">Límite de crédito: {formatGs(cliente.limite_credito)}</p>
      )}
      {cliente.notas && <p className="mb-3 mt-2 rounded-lg bg-rose-50 p-2.5 text-[13px] text-ink-900">{cliente.notas}</p>}

      <div className="mb-4 mt-3 flex flex-wrap gap-2">
        {hrefWhatsApp && cliente.saldo_actual > 0 && (
          <a
            href={hrefWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-success-soft px-4 text-[14px] font-semibold text-success hover:opacity-90"
          >
            <MessageCircle size={17} /> Recordar por WhatsApp
          </a>
        )}
      </div>

      {cliente.saldo_actual > 0 && <RegistrarPagoForm clienteId={cliente.id} saldoActual={cliente.saldo_actual} />}

      <Card className="mt-4">
        <p className="mb-3 text-[14px] font-bold text-ink-900">Historial</p>
        {historial.length === 0 && <p className="text-[13px] text-ink-600">Todavía no hay movimientos.</p>}
        <ul className="flex flex-col gap-2.5">
          {historial.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-[13.5px]">
              <div className="min-w-0">
                <span className={m.tipo === "deuda" ? "font-semibold text-alert" : "font-semibold text-success"}>
                  {m.tipo === "deuda" ? "Deuda" : "Pago"}
                </span>
                <span className="ml-2 text-ink-600">
                  {new Date(m.created_at).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
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
    </div>
  );
}
