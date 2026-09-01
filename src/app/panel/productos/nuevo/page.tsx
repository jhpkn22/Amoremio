import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ArticuloForm } from "@/components/productos/ArticuloForm";
import type { Categoria } from "@/lib/types/database";

export default async function NuevoArticuloPage() {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .is("deleted_at", null)
    .order("orden");

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/panel/productos"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Productos
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nuevo artículo</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        El código interno (ART-0001, ART-0002…) se genera solo al guardar. El stock se carga después, desde Compras.
      </p>
      <ArticuloForm categorias={(categorias as Categoria[]) ?? []} esAdmin={usuario.rol === "admin"} />
    </div>
  );
}
