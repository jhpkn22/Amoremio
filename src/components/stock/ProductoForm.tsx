"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Field, Label, Input, Textarea, Select, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { crearProducto, actualizarProducto, type ProductoInput } from "@/app/panel/stock/actions";
import type { Categoria, Producto } from "@/lib/types/database";

export function ProductoForm({
  modo,
  producto,
  categorias,
  esAdmin,
  costoActual,
}: {
  modo: "crear" | "editar";
  producto?: Producto;
  categorias: Categoria[];
  esAdmin: boolean;
  costoActual?: number | null;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<string[]>(producto?.opciones_personalizacion ?? []);
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const [esAPedido, setEsAPedido] = useState(producto?.es_a_pedido ?? false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const datos: ProductoInput = {
      nombre: String(form.get("nombre") || ""),
      descripcion: String(form.get("descripcion") || ""),
      categoria_id: (form.get("categoria_id") as string) || null,
      proveedor: String(form.get("proveedor") || ""),
      precio_venta: Number(form.get("precio_venta") || 0),
      precio_costo: esAdmin && form.get("precio_costo") ? Number(form.get("precio_costo")) : null,
      stock_inicial: Number(form.get("stock_inicial") || 0),
      stock_minimo: Number(form.get("stock_minimo") || 0),
      visible_en_vitrina: form.get("visible_en_vitrina") === "on",
      es_a_pedido: esAPedido,
      dias_demora: esAPedido && form.get("dias_demora") ? Number(form.get("dias_demora")) : null,
      opciones_personalizacion: opciones,
    };

    const resultado =
      modo === "crear" ? await crearProducto(datos) : await actualizarProducto(producto!.id, datos);

    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    if (modo === "crear" && resultado.id) {
      router.push(`/panel/stock/${resultado.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre del producto</Label>
        <Input id="nombre" name="nombre" required defaultValue={producto?.nombre} placeholder="Taza personalizada" />
      </Field>

      <Field>
        <Label htmlFor="descripcion" opcional>Descripción</Label>
        <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion ?? ""} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="categoria_id" opcional>Categoría</Label>
          <Select id="categoria_id" name="categoria_id" defaultValue={producto?.categoria_id ?? ""}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="proveedor" opcional>Proveedor</Label>
          <Input id="proveedor" name="proveedor" defaultValue={producto?.proveedor ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="precio_venta">Precio de venta (Gs.)</Label>
          <Input id="precio_venta" name="precio_venta" type="number" min={0} step={500} required defaultValue={producto?.precio_venta} />
        </Field>
        {esAdmin && (
          <Field>
            <Label htmlFor="precio_costo" opcional>Precio de costo (Gs.)</Label>
            <Input id="precio_costo" name="precio_costo" type="number" min={0} step={500} defaultValue={costoActual ?? ""} />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="stock_inicial">{modo === "crear" ? "Stock inicial" : "Stock actual"}</Label>
          <Input
            id="stock_inicial"
            name="stock_inicial"
            type="number"
            min={0}
            defaultValue={modo === "crear" ? 0 : producto?.stock_actual}
            disabled={modo === "editar"}
          />
          {modo === "editar" && (
            <p className="mt-1 text-[12px] text-ink-600">Para cambiar el stock, usá los movimientos de abajo — así queda en el historial.</p>
          )}
        </Field>
        <Field>
          <Label htmlFor="stock_minimo">Stock mínimo</Label>
          <Input id="stock_minimo" name="stock_minimo" type="number" min={0} defaultValue={producto?.stock_minimo ?? 0} />
        </Field>
      </div>

      <Field>
        <Label opcional>Opciones de personalización</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {opciones.map((op, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[12.5px] font-medium text-ink-900">
              {op}
              <button type="button" onClick={() => setOpciones(opciones.filter((_, idx) => idx !== i))} aria-label={`Quitar ${op}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={nuevaOpcion}
            onChange={(e) => setNuevaOpcion(e.target.value)}
            placeholder="Ej: texto a grabar"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (nuevaOpcion.trim()) {
                  setOpciones([...opciones, nuevaOpcion.trim()]);
                  setNuevaOpcion("");
                }
              }
            }}
          />
          <Button
            type="button"
            variante="secundario"
            onClick={() => {
              if (nuevaOpcion.trim()) {
                setOpciones([...opciones, nuevaOpcion.trim()]);
                setNuevaOpcion("");
              }
            }}
          >
            Agregar
          </Button>
        </div>
      </Field>

      <Field className="flex items-center gap-2.5">
        <input
          id="es_a_pedido"
          type="checkbox"
          checked={esAPedido}
          onChange={(e) => setEsAPedido(e.target.checked)}
          className="h-5 w-5 accent-rose-700"
        />
        <Label htmlFor="es_a_pedido" className="mb-0!">Es a pedido</Label>
      </Field>

      {esAPedido && (
        <Field>
          <Label htmlFor="dias_demora" opcional>Días de demora</Label>
          <Input id="dias_demora" name="dias_demora" type="number" min={0} defaultValue={producto?.dias_demora ?? ""} className="max-w-[140px]" />
        </Field>
      )}

      <Field className="flex items-center gap-2.5">
        <input
          id="visible_en_vitrina"
          name="visible_en_vitrina"
          type="checkbox"
          defaultChecked={producto?.visible_en_vitrina ?? true}
          className="h-5 w-5 accent-rose-700"
        />
        <Label htmlFor="visible_en_vitrina" className="mb-0!">Visible en la vitrina</Label>
      </Field>

      <CampoError>{error}</CampoError>

      <Button type="submit" tamaño="grande" className="mt-2 w-full sm:w-auto" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "crear" ? "Crear producto" : "Guardar cambios"}
      </Button>
    </form>
  );
}
