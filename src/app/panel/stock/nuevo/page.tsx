import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ProductoForm } from "@/components/stock/ProductoForm";
import type { Categoria } from "@/lib/types/database";

export default async function NuevoProductoPage() {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();
  const { data: categorias } = await supabase.from("categorias").select("*").is("deleted_at", null).order("orden");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nuevo producto</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        El código interno (AM-0001, AM-0002…) se genera solo al guardar. Las fotos y las variantes se cargan después, desde la ficha del producto.
      </p>
      <ProductoForm modo="crear" categorias={(categorias as Categoria[]) ?? []} esAdmin={usuario.rol === "admin"} />
    </div>
  );
}
