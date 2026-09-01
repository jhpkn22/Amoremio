"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Label, Input, Textarea, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { crearProveedor, actualizarProveedor } from "@/app/panel/proveedores/actions";
import type { Proveedor } from "@/lib/types/database";

export function ProveedorForm({ proveedor }: { proveedor?: Proveedor }) {
  const router = useRouter();
  const modo = proveedor ? "editar" : "crear";
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState(proveedor?.activo ?? true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const datos = {
      nombre: String(form.get("nombre") || ""),
      ruc: String(form.get("ruc") || "") || null,
      telefono: String(form.get("telefono") || "") || null,
      descripcion: String(form.get("descripcion") || "") || null,
      activo,
    };
    const res = modo === "crear" ? await crearProveedor(datos) : await actualizarProveedor(proveedor!.id, datos);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (modo === "crear" && res.id) router.push(`/panel/proveedores/${res.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre del proveedor</Label>
        <Input id="nombre" name="nombre" required defaultValue={proveedor?.nombre} placeholder="Distribuidora XYZ" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="ruc" opcional>RUC</Label>
          <Input id="ruc" name="ruc" defaultValue={proveedor?.ruc ?? ""} placeholder="80012345-6" />
        </Field>
        <Field>
          <Label htmlFor="telefono" opcional>Teléfono</Label>
          <Input id="telefono" name="telefono" defaultValue={proveedor?.telefono ?? ""} />
        </Field>
      </div>

      <Field>
        <Label htmlFor="descripcion" opcional>Qué vende</Label>
        <Textarea id="descripcion" name="descripcion" defaultValue={proveedor?.descripcion ?? ""} placeholder="Termos, mates, accesorios…" />
      </Field>

      {modo === "editar" && (
        <Field className="flex items-center gap-2.5">
          <input
            id="activo"
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-5 w-5 accent-rose-700"
          />
          <Label htmlFor="activo" className="mb-0!">Activo</Label>
        </Field>
      )}

      <CampoError>{error}</CampoError>

      <Button type="submit" tamaño="grande" className="mt-2 w-full sm:w-auto" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "crear" ? "Crear proveedor" : "Guardar cambios"}
      </Button>
    </form>
  );
}
