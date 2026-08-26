"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, Input, Label, Field, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { registrarMovimiento } from "@/app/panel/stock/actions";
import type { TipoMovimientoStock, Variante } from "@/lib/types/database";

const etiquetasTipo: Record<TipoMovimientoStock, string> = {
  entrada: "Entrada (compra a proveedor)",
  salida: "Salida manual",
  ajuste: "Ajuste con motivo",
  devolucion: "Devolución",
};

export function MovimientoForm({ productoId, variantes }: { productoId: string; variantes: Variante[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoMovimientoStock>("entrada");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);

    const resultado = await registrarMovimiento({
      producto_id: productoId,
      variante_id: (form.get("variante_id") as string) || null,
      tipo,
      cantidad: Number(form.get("cantidad") || 0),
      motivo: String(form.get("motivo") || ""),
    });

    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field className="col-span-2 mb-2 sm:col-span-1">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimientoStock)}>
            {Object.entries(etiquetasTipo).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </Select>
        </Field>
        {variantes.length > 0 && (
          <Field className="mb-2">
            <Label htmlFor="variante_id" opcional>Variante</Label>
            <Select id="variante_id" name="variante_id" defaultValue="">
              <option value="">Producto general</option>
              {variantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.talle, v.color, v.modelo].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field className="mb-2">
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input id="cantidad" name="cantidad" type="number" min={1} required placeholder="1" />
        </Field>
        <Field className="mb-2">
          <Label htmlFor="motivo" opcional={tipo !== "ajuste"}>Motivo {tipo === "ajuste" && "(obligatorio)"}</Label>
          <Input id="motivo" name="motivo" required={tipo === "ajuste"} placeholder={tipo === "ajuste" ? "Rotura, robo, conteo…" : ""} />
        </Field>
      </div>
      <CampoError>{error}</CampoError>
      <Button type="submit" variante="secundario" disabled={guardando}>
        {guardando ? "Registrando…" : "Registrar movimiento"}
      </Button>
    </form>
  );
}
