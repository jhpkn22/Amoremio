import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ProductoForm } from "@/components/tienda-web/ProductoForm";
import type { Categoria } from "@/lib/types/database";

export default async function NuevaPiezaTiendaWebPage() {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();
  const { data: categorias } = await supabase.from("categorias").select("*").is("deleted_at", null).order("orden");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nueva pieza de muestra</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        El código interno (AM-0001, AM-0002…) se genera solo al guardar. Las fotos se cargan después, desde la ficha de la pieza.
      </p>
      <ProductoForm modo="crear" categorias={(categorias as Categoria[]) ?? []} esAdmin={usuario.rol === "admin"} />
    </div>
  );
}
