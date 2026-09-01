import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { BarcodeLabel } from "@/components/productos/BarcodeLabel";
import { BotonImprimirEtiqueta } from "@/components/productos/BotonImprimirEtiqueta";
import type { Articulo } from "@/lib/types/database";

export default async function EtiquetaArticuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirUsuario();
  const supabase = await createClient();

  const { data: articulo } = await supabase
    .from("articulos")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!articulo) notFound();
  const a = articulo as Articulo;
  const codigo = a.codigo_barras ?? a.codigo_interno;

  return (
    <div>
      <div className="no-print mb-5 flex items-center justify-between">
        <Link
          href={`/panel/productos/${id}`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={16} /> Volver al artículo
        </Link>
        <BotonImprimirEtiqueta articuloId={id} yaImpreso={a.codigo_barras_impreso} />
      </div>

      {!a.codigo_barras && (
        <p className="no-print mb-4 max-w-md rounded-xl border border-alert bg-alert-soft p-3 text-[13px] text-alert">
          Este artículo todavía no tiene código de barras propio — se muestra el código interno. Generá o asigná uno
          desde la ficha del artículo antes de imprimir.
        </p>
      )}

      <p className="no-print mb-4 max-w-md text-[13px] text-ink-600">
        Imprimí y pegá esta etiqueta en el producto. Al imprimir por primera vez, el código de barras queda fijo.
      </p>

      <div className="flex flex-wrap gap-4">
        <BarcodeLabel codigo={codigo} nombre={a.nombre} />
      </div>
    </div>
  );
}
