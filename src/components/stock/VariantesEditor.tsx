"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input, Label, Field, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { crearVariante } from "@/app/panel/stock/actions";
import { formatGs } from "@/lib/utils";
import type { Variante } from "@/lib/types/database";

export function VariantesEditor({ productoId, variantesIniciales }: { productoId: string; variantesIniciales: Variante[] }) {
  const [variantes, setVariantes] = useState(variantesIniciales);
  const [mostrarForm, setMostrarForm] = useState(variantesIniciales.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);

    const talle = String(form.get("talle") || "");
    const color = String(form.get("color") || "");
    const modelo = String(form.get("modelo") || "");
    if (!talle && !color && !modelo) {
      setError("Completá al menos talle, color o modelo para distinguir la variante.");
      setGuardando(false);
      return;
    }

    const resultado = await crearVariante({
      producto_id: productoId,
      talle: talle || undefined,
      color: color || undefined,
      modelo: modelo || undefined,
      stock_inicial: Number(form.get("stock_inicial") || 0),
      stock_minimo: Number(form.get("stock_minimo") || 0),
      precio_venta: form.get("precio_venta") ? Number(form.get("precio_venta")) : undefined,
    });

    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setVariantes((prev) => [
      ...prev,
      {
        id: resultado.id!,
        producto_id: productoId,
        talle: talle || null,
        color: color || null,
        modelo: modelo || null,
        codigo_interno: "—",
        stock_actual: Number(form.get("stock_inicial") || 0),
        stock_minimo: Number(form.get("stock_minimo") || 0),
        precio_venta: form.get("precio_venta") ? Number(form.get("precio_venta")) : null,
        deleted_at: null,
      },
    ]);
    (e.target as HTMLFormElement).reset();
    setMostrarForm(false);
  }

  return (
    <div>
      {variantes.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {variantes.map((v) => {
            const etiqueta = [v.talle, v.color, v.modelo].filter(Boolean).join(" · ") || "Variante";
            const alerta = v.stock_actual <= v.stock_minimo;
            return (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div>
                  <p className="text-[14px] font-semibold text-ink-900">{etiqueta}</p>
                  <p className="font-mono text-[11.5px] text-ink-600">{v.codigo_interno}</p>
                </div>
                <div className="flex items-center gap-2">
                  {v.precio_venta && <span className="tabular text-[13px] text-ink-600">{formatGs(v.precio_venta)}</span>}
                  {alerta ? <Badge tono="alerta">{v.stock_actual} u.</Badge> : <Badge tono="neutral">{v.stock_actual} u.</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mostrarForm ? (
        <form onSubmit={onSubmit} className="rounded-xl border border-dashed border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            <Field className="mb-2">
              <Label htmlFor="talle" opcional>Talle</Label>
              <Input id="talle" name="talle" placeholder="M" />
            </Field>
            <Field className="mb-2">
              <Label htmlFor="color" opcional>Color</Label>
              <Input id="color" name="color" placeholder="Rosa" />
            </Field>
            <Field className="mb-2">
              <Label htmlFor="modelo" opcional>Modelo</Label>
              <Input id="modelo" name="modelo" placeholder="Clásico" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field className="mb-2">
              <Label htmlFor="stock_inicial">Stock inicial</Label>
              <Input id="stock_inicial" name="stock_inicial" type="number" min={0} defaultValue={0} />
            </Field>
            <Field className="mb-2">
              <Label htmlFor="stock_minimo">Stock mínimo</Label>
              <Input id="stock_minimo" name="stock_minimo" type="number" min={0} defaultValue={0} />
            </Field>
            <Field className="mb-2">
              <Label htmlFor="precio_venta" opcional>Precio distinto</Label>
              <Input id="precio_venta" name="precio_venta" type="number" min={0} step={500} />
            </Field>
          </div>
          <CampoError>{error}</CampoError>
          <div className="flex gap-2">
            <Button type="submit" variante="secundario" disabled={guardando}>{guardando ? "Guardando…" : "Agregar variante"}</Button>
            {variantes.length > 0 && (
              <Button type="button" variante="fantasma" onClick={() => setMostrarForm(false)}>Cancelar</Button>
            )}
          </div>
        </form>
      ) : (
        <Button type="button" variante="secundario" onClick={() => setMostrarForm(true)}>
          <Plus size={16} /> Agregar variante
        </Button>
      )}
    </div>
  );
}
