"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Label, Input, Select, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { actualizarArticulo } from "@/app/panel/productos/actions";
import type { Articulo, Categoria } from "@/lib/types/database";

export function DatosArticuloForm({
  articulo,
  categorias,
  esAdmin,
  costoActual,
}: {
  articulo: Articulo;
  categorias: Categoria[];
  esAdmin: boolean;
  costoActual: number | null;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState(articulo.activo);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const res = await actualizarArticulo(articulo.id, {
      nombre: String(form.get("nombre") || ""),
      categoria_id: (form.get("categoria_id") as string) || null,
      precio_venta: Number(form.get("precio_venta") || 0),
      precio_costo: esAdmin && form.get("precio_costo") ? Number(form.get("precio_costo")) : null,
      stock_minimo: Number(form.get("stock_minimo") || 0),
      activo,
    });
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required defaultValue={articulo.nombre} />
      </Field>

      <Field>
        <Label htmlFor="categoria_id" opcional>Categoría</Label>
        <Select id="categoria_id" name="categoria_id" defaultValue={articulo.categoria_id ?? ""}>
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="precio_venta">Precio de venta (Gs.)</Label>
          <Input
            id="precio_venta"
            name="precio_venta"
            type="number"
            min={0}
            step={500}
            required
            defaultValue={articulo.precio_venta}
          />
          {articulo.descuento_pct > 0 && (
            <p className="mt-1 text-[12px] text-ink-600">
              Tiene un {articulo.descuento_pct}% de descuento aplicado desde Inteligencia
              {articulo.precio_lista ? ` (precio de lista Gs. ${articulo.precio_lista.toLocaleString("es-PY")})` : ""}.
            </p>
          )}
        </Field>
        {esAdmin && (
          <Field>
            <Label htmlFor="precio_costo" opcional>Precio de costo (Gs.)</Label>
            <Input
              id="precio_costo"
              name="precio_costo"
              type="number"
              min={0}
              step={500}
              defaultValue={costoActual ?? ""}
            />
          </Field>
        )}
      </div>

      <Field>
        <Label htmlFor="stock_minimo" opcional>Stock mínimo (para alertas)</Label>
        <Input
          id="stock_minimo"
          name="stock_minimo"
          type="number"
          min={0}
          defaultValue={articulo.stock_minimo}
          className="max-w-[160px]"
        />
      </Field>

      <Field className="flex items-center gap-2.5">
        <input
          id="activo"
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="h-5 w-5 accent-rose-700"
        />
        <Label htmlFor="activo" className="mb-0!">Activo (se puede comprar y vender)</Label>
      </Field>

      <CampoError>{error}</CampoError>

      <Button type="submit" tamaño="grande" className="mt-2 w-full sm:w-auto" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
