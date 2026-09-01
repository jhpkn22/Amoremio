"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Barcode, Check } from "lucide-react";
import { Field, Label, Input, Select, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { crearArticulo } from "@/app/panel/productos/actions";
import type { Categoria } from "@/lib/types/database";

export function ArticuloForm({
  categorias,
  esAdmin,
}: {
  categorias: Categoria[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [codigoBarras, setCodigoBarras] = useState("");
  const [sinCodigo, setSinCodigo] = useState(false);

  const puedeGuardar = codigoBarras.trim().length > 0 || sinCodigo;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!puedeGuardar) {
      setError("Escaneá el código de barras o marcá «No tiene código de barras».");
      return;
    }
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await crearArticulo({
      nombre: String(form.get("nombre") || ""),
      categoria_id: (form.get("categoria_id") as string) || null,
      precio_venta: Number(form.get("precio_venta") || 0),
      precio_costo: esAdmin && form.get("precio_costo") ? Number(form.get("precio_costo")) : null,
      stock_minimo: Number(form.get("stock_minimo") || 0),
      codigo_barras: sinCodigo ? null : codigoBarras.trim(),
      sin_codigo: sinCodigo,
    });

    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.id) router.push(`/panel/productos/${res.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre del artículo</Label>
        <Input id="nombre" name="nombre" required placeholder="Termo Stanley 1L" />
      </Field>

      <Field>
        <Label htmlFor="categoria_id" opcional>Categoría</Label>
        <Select id="categoria_id" name="categoria_id" defaultValue="">
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="precio_venta">Precio de venta (Gs.)</Label>
          <Input id="precio_venta" name="precio_venta" type="number" min={0} step={500} required />
        </Field>
        {esAdmin && (
          <Field>
            <Label htmlFor="precio_costo" opcional>Precio de costo (Gs.)</Label>
            <Input id="precio_costo" name="precio_costo" type="number" min={0} step={500} />
          </Field>
        )}
      </div>

      <Field>
        <Label htmlFor="stock_minimo" opcional>Stock mínimo (para alertas)</Label>
        <Input id="stock_minimo" name="stock_minimo" type="number" min={0} defaultValue={0} className="max-w-[160px]" />
      </Field>

      {/* Código de barras: escanear uno de fábrica, o marcar que no tiene */}
      <Field>
        <Label>Código de barras</Label>
        <div className="rounded-xl border border-border p-3">
          {!sinCodigo ? (
            <>
              <div className="relative">
                <ScanLine size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400" />
                <input
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  autoFocus
                  placeholder="Escaneá el código impreso en el producto…"
                  inputMode="text"
                  autoComplete="off"
                  className="min-h-12 w-full rounded-xl border border-border-strong bg-surface pl-10 pr-3.5 text-[16px] font-medium text-ink-900 placeholder:text-ink-600/60 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              {codigoBarras.trim() && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-success">
                  <Check size={14} /> Se guarda como código de fábrica (no se podrá cambiar después).
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSinCodigo(true);
                  setCodigoBarras("");
                }}
                className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-rose-700"
              >
                <Barcode size={15} /> No tiene código de barras
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] text-ink-900">
                Sin código de barras — vas a poder generar uno desde la ficha del artículo.
              </p>
              <button
                type="button"
                onClick={() => setSinCodigo(false)}
                className="text-[13px] font-semibold text-rose-700"
              >
                Escanear uno
              </button>
            </div>
          )}
        </div>
      </Field>

      <CampoError>{error}</CampoError>

      <Button
        type="submit"
        tamaño="grande"
        className={cn("mt-2 w-full sm:w-auto")}
        disabled={guardando || !puedeGuardar}
      >
        {guardando ? "Guardando…" : "Crear artículo"}
      </Button>
    </form>
  );
}
