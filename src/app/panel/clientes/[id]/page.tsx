import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { formatGs } from "@/lib/utils";
import type { Cliente } from "@/lib/types/database";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirUsuario();
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle<Cliente>();
  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/panel/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Clientes
      </Link>

      <div className="mb-3 flex items-start justify-between gap-2">
        <h1 className="text-[20px] font-bold text-ink-900">{cliente.nombre}</h1>
        {cliente.saldo_actual > 0 && (
          <span className="tabular shrink-0 text-[18px] font-bold text-alert">{formatGs(cliente.saldo_actual)}</span>
        )}
      </div>

      <Link
        href={`/panel/deudas/${cliente.id}`}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
      >
        <Wallet size={16} /> Ver estado de cuenta
      </Link>

      <Card>
        <p className="mb-3 text-[14px] font-bold text-ink-900">Datos del cliente</p>
        <ClienteForm cliente={cliente} />
      </Card>
    </div>
  );
}
