import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { CsvImporter } from "@/components/stock/CsvImporter";

export default async function ImportarPage() {
  const { usuario } = await exigirUsuario();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/panel/stock" className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver al stock
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Cargar productos desde una planilla</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        Para la migración inicial desde el cuaderno o Excel. Exportá tu planilla como CSV con estas columnas y la
        subís acá — las categorías que no existan se crean solas.
      </p>
      <CsvImporter esAdmin={usuario.rol === "admin"} />
    </div>
  );
}
