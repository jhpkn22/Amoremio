import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerWhatsAppLocal } from "@/lib/vitrina/configuracion";
import { urlFotoProducto } from "@/lib/supabase/storage";
import { ConsultarWhatsApp } from "@/components/vitrina/ConsultarWhatsApp";
import { formatGs } from "@/lib/utils";
import type { Producto, Variante } from "@/lib/types/database";

async function cargarProducto(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("*, categorias(nombre, slug), producto_fotos(path_original, path_thumbnail, orden)")
    .eq("id", id)
    .maybeSingle<Producto>();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const producto = await cargarProducto(id);
  if (!producto) return { title: "Producto — Amore Mío" };

  const foto = producto.producto_fotos?.[0];
  const descripcion = producto.descripcion?.slice(0, 155) ?? `${producto.nombre} — Amore Mío, regalos personalizados en Coronel Bogado, Itapúa.`;

  return {
    title: `${producto.nombre} — Amore Mío`,
    description: descripcion,
    openGraph: {
      title: producto.nombre,
      description: descripcion,
      images: foto ? [urlFotoProducto(foto.path_original)] : undefined,
    },
  };
}

export default async function ProductoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const producto = await cargarProducto(id);
  if (!producto) notFound();

  const supabase = await createClient();
  const [{ data: variantesData }, numeroWhatsApp] = await Promise.all([
    supabase.from("variantes").select("*").eq("producto_id", id).is("deleted_at", null),
    obtenerWhatsAppLocal(supabase),
  ]);

  const fotos = [...(producto.producto_fotos ?? [])].sort((a, b) => a.orden - b.orden);
  const variantes = (variantesData ?? []) as Variante[];

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 lg:max-w-5xl">
      <Link href="/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft size={16} /> Volver al catálogo
      </Link>

      <div className="grid gap-6 sm:grid-cols-2 lg:gap-10">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-rose-50">
            {fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlFotoProducto(fotos[0].path_original)} alt={producto.nombre} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff size={32} className="text-rose-300" />
              </div>
            )}
          </div>
          {fotos.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {fotos.slice(1).map((f) => (
                <div key={f.id} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-rose-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlFotoProducto(f.path_thumbnail ?? f.path_original)} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {producto.categorias && (
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-rose-700">{producto.categorias.nombre}</p>
          )}
          <h1 className="mt-1 text-[24px] font-bold text-ink-900">{producto.nombre}</h1>
          <p className="tabular mt-2 text-[26px] font-bold text-rose-700">{formatGs(producto.precio_venta)}</p>

          {producto.descripcion && <p className="mt-4 text-[14.5px] leading-relaxed text-ink-900">{producto.descripcion}</p>}

          {producto.opciones_personalizacion?.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[13px] font-semibold text-ink-900">Se puede personalizar con:</p>
              <ul className="flex flex-wrap gap-1.5">
                {producto.opciones_personalizacion.map((op) => (
                  <li key={op} className="rounded-full bg-rose-50 px-3 py-1 text-[12.5px] font-medium text-ink-900">
                    {op}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {producto.es_a_pedido && (
            <p className="mt-4 rounded-xl bg-rose-50 p-3 text-[13px] text-ink-900">
              Este producto es a pedido
              {producto.dias_demora ? ` — demora aproximada de ${producto.dias_demora} día${producto.dias_demora === 1 ? "" : "s"}.` : "."}
            </p>
          )}

          <div className="mt-6">
            <ConsultarWhatsApp
              numeroWhatsApp={numeroWhatsApp}
              nombreProducto={producto.nombre}
              codigoProducto={producto.codigo_interno}
              precioBase={producto.precio_venta}
              variantes={variantes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
