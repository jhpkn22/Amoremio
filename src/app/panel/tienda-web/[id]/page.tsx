import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { ProductoForm } from "@/components/tienda-web/ProductoForm";
import { FotosUploader } from "@/components/tienda-web/FotosUploader";
import { Card } from "@/components/ui/Card";
import { formatGs } from "@/lib/utils";
import type { Categoria, Producto, ProductoFoto } from "@/lib/types/database";

export default async function PiezaTiendaWebPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";
  const supabase = await createClient();

  const [{ data: producto, error }, { data: categorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("*, producto_fotos(*), producto_costos(precio_costo)")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase.from("categorias").select("*").is("deleted_at", null).order("orden"),
  ]);

  if (error || !producto) notFound();
  const p = producto as Producto;
  const fotos = ((p.producto_fotos as ProductoFoto[]) ?? []).sort((a, b) => a.orden - b.orden);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/panel/tienda-web"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Tienda web
      </Link>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-ink-900">{p.nombre}</h1>
        <p className="font-mono text-[13px] text-ink-600">
          {p.codigo_interno} · {formatGs(p.precio_venta)}
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Fotos</h2>
          <FotosUploader productoId={p.id} fotosIniciales={fotos} />
        </Card>

        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Datos de la pieza</h2>
          <ProductoForm
            modo="editar"
            producto={p}
            categorias={(categorias as Categoria[]) ?? []}
            esAdmin={esAdmin}
            costoActual={p.producto_costos?.precio_costo ?? null}
          />
        </Card>
      </div>
    </div>
  );
}
