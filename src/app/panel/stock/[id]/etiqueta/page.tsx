import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BarcodeLabel } from "@/components/stock/BarcodeLabel";
import { BotonImprimir } from "@/components/stock/BotonImprimir";
import type { Producto, Variante } from "@/lib/types/database";

export default async function EtiquetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: producto }, { data: variantes }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).single(),
    supabase.from("variantes").select("*").eq("producto_id", id).is("deleted_at", null),
  ]);

  if (!producto) notFound();
  const p = producto as Producto;
  const vs = (variantes as Variante[]) ?? [];

  return (
    <div>
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/panel/stock/${id}`} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900">
          <ArrowLeft size={16} /> Volver al producto
        </Link>
        <BotonImprimir />
      </div>

      <p className="no-print mb-4 max-w-md text-[13px] text-ink-600">
        Imprimí y pegá esta etiqueta en el producto. Si tiene variantes, cada una trae su propio código
        (AM-0001-A, AM-0001-B…) para que el lector distinga talle/color al escanear en Caja.
      </p>

      <div className="flex flex-wrap gap-4">
        <BarcodeLabel codigo={p.codigo_interno} nombre={p.nombre} />
        {vs.map((v) => (
          <BarcodeLabel
            key={v.id}
            codigo={v.codigo_interno}
            nombre={`${p.nombre} — ${[v.talle, v.color, v.modelo].filter(Boolean).join(" · ")}`}
          />
        ))}
      </div>
    </div>
  );
}
