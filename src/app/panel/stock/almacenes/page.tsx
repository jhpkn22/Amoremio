import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AlmacenesManager } from "@/components/stock/AlmacenesManager";
import type { Almacen } from "@/lib/types/database";

export default async function AlmacenesPage() {
  await exigirUsuario();
  const supabase = await createClient();
  const { data } = await supabase
    .from("almacenes")
    .select("*")
    .is("deleted_at", null)
    .order("es_principal", { ascending: false })
    .order("nombre");

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/panel/stock"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Stock
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Almacenes</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        Los lugares donde guardás mercadería. El principal es el que la Caja sugiere al abrir turno.
      </p>
      <AlmacenesManager almacenes={(data ?? []) as Almacen[]} />
    </div>
  );
}
