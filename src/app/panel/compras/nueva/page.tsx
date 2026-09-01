import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompraForm } from "@/components/compras/CompraForm";
import { Button } from "@/components/ui/Button";
import type { Almacen, Proveedor } from "@/lib/types/database";

export default async function NuevaCompraPage() {
  await exigirUsuario();
  const supabase = await createClient();

  const [{ data: proveedores }, { data: almacenes }] = await Promise.all([
    supabase.from("proveedores").select("*").is("deleted_at", null).eq("activo", true).order("nombre"),
    supabase
      .from("almacenes")
      .select("*")
      .is("deleted_at", null)
      .eq("activo", true)
      .order("es_principal", { ascending: false })
      .order("nombre"),
  ]);

  const provs = (proveedores ?? []) as Proveedor[];
  const alms = (almacenes ?? []) as Almacen[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/panel/compras"
        className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Volver a Compras
      </Link>
      <h1 className="mb-1 text-[22px] font-bold text-ink-900">Nueva compra</h1>
      <p className="mb-5 text-[13px] text-ink-600">
        Elegí proveedor y almacén, agregá los artículos con su costo (y precio de venta nuevo si cambió), y confirmá.
      </p>

      {provs.length === 0 || alms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-ink-600">
          {provs.length === 0 && (
            <p>
              Primero cargá un <Button href="/panel/proveedores/nuevo" variante="fantasma">proveedor</Button>.
            </p>
          )}
          {alms.length === 0 && (
            <p>
              Primero creá un <Button href="/panel/stock/almacenes" variante="fantasma">almacén</Button>.
            </p>
          )}
        </div>
      ) : (
        <CompraForm proveedores={provs} almacenes={alms} />
      )}
    </div>
  );
}
