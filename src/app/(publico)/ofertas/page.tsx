import Link from "next/link";
import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerWhatsAppLocal } from "@/lib/vitrina/configuracion";
import { TarjetaProducto } from "@/components/vitrina/TarjetaProducto";
import type { Producto } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Ofertas — Amore Mío",
  description: "Regalos personalizados en oferta en Amore Mío. Coronel Bogado, Itapúa.",
};

const TAMAÑO_PAGINA = 12;

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ limite?: string }>;
}) {
  const { limite } = await searchParams;
  const limiteNum = Math.min(Number(limite) || TAMAÑO_PAGINA, 96);
  const supabase = await createClient();

  const [{ data, count }, numeroWhatsApp] = await Promise.all([
    supabase
      .from("productos")
      .select("*, categorias(id, nombre, slug), producto_fotos(path_original, path_thumbnail, orden)", { count: "exact" })
      .eq("visible_en_vitrina", true)
      .eq("en_oferta", true)
      .is("deleted_at", null)
      .order("nombre")
      .range(0, limiteNum - 1),
    obtenerWhatsAppLocal(supabase),
  ]);

  const productos = ((data ?? []) as Producto[]).map((p) => ({
    ...p,
    producto_fotos: [...(p.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden),
  }));

  const hayMas = (count ?? 0) > productos.length;

  return (
    <div>
      <div className="mx-auto max-w-3xl px-5 pt-6 lg:max-w-6xl">
        <div className="flex items-center gap-2">
          <Tag size={20} className="text-rose-700" />
          <h1 className="text-[22px] font-bold text-ink-900">Ofertas</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-4 lg:max-w-6xl">
        {productos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <Tag size={32} className="text-rose-300" />
            <p className="text-[14px] font-semibold text-ink-900">Todavía no hay productos en oferta</p>
            <p className="max-w-xs text-[13px] text-ink-600">Volvé pronto — estamos preparando promociones.</p>
            <Link
              href="/catalogo"
              className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-border-strong px-5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
            >
              Ver catálogo completo →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} numeroWhatsApp={numeroWhatsApp} />
              ))}
            </div>
            {hayMas && (
              <div className="mt-7 flex justify-center">
                <Link
                  href={`/ofertas?limite=${limiteNum + TAMAÑO_PAGINA}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-5 text-[14px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Ver más
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
