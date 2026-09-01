import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export default async function NuevoClientePage() {
  await exigirUsuario();
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/panel/clientes"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Clientes
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nuevo cliente</h1>
      <p className="mb-5 text-[13px] text-ink-600">El estado de cuenta (deudas y pagos) se ve en la pestaña Deudas.</p>
      <ClienteForm />
    </div>
  );
}
