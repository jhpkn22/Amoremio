import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ProveedorForm } from "@/components/proveedores/ProveedorForm";

export default async function NuevoProveedorPage() {
  await exigirUsuario();
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/panel/proveedores"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Proveedores
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nuevo proveedor</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        Después vas a ver acá su cuenta: lo que le debés y los pagos que le vayas haciendo.
      </p>
      <ProveedorForm />
    </div>
  );
}
