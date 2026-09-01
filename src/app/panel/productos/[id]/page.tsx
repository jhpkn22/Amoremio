import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/auth";
import { DatosArticuloForm } from "@/components/productos/DatosArticuloForm";
import { CodigoBarrasPanel } from "@/components/productos/CodigoBarrasPanel";
import { Card } from "@/components/ui/Card";
import { formatGs } from "@/lib/utils";
import type { Articulo, Categoria } from "@/lib/types/database";

export default async function ArticuloDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usuario } = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";
  const supabase = await createClient();

  const [{ data: articulo, error }, { data: categorias }] = await Promise.all([
    supabase
      .from("articulos")
      .select("*, articulo_costos(precio_costo)")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase.from("categorias").select("*").is("deleted_at", null).order("orden"),
  ]);

  if (error || !articulo) notFound();
  const a = articulo as Articulo;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/panel/productos"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Productos
      </Link>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-ink-900">{a.nombre}</h1>
        <p className="font-mono text-[13px] text-ink-600">
          {a.codigo_interno} · {formatGs(a.precio_venta)}
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Código de barras</h2>
          <CodigoBarrasPanel articulo={a} />
        </Card>

        <Card>
          <h2 className="mb-3 text-[15px] font-bold text-ink-900">Datos del artículo</h2>
          <DatosArticuloForm
            articulo={a}
            categorias={(categorias as Categoria[]) ?? []}
            esAdmin={esAdmin}
            costoActual={a.articulo_costos?.precio_costo ?? null}
          />
        </Card>
      </div>
    </div>
  );
}
