"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Label, Input, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { crearAlmacen, actualizarAlmacen } from "@/app/panel/stock/actions";
import type { Almacen } from "@/lib/types/database";

export function AlmacenForm({ almacen, onListo }: { almacen?: Almacen; onListo?: () => void }) {
  const router = useRouter();
  const modo = almacen ? "editar" : "crear";
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(almacen?.es_principal ?? false);
  const [activo, setActivo] = useState(almacen?.activo ?? true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const datos = {
      nombre: String(form.get("nombre") || ""),
      direccion: String(form.get("direccion") || "") || null,
      es_principal: esPrincipal,
      activo,
    };
    const res = modo === "crear" ? await crearAlmacen(datos) : await actualizarAlmacen(almacen!.id, datos);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    onListo?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required defaultValue={almacen?.nombre} placeholder="Local, Depósito…" />
      </Field>
      <Field>
        <Label htmlFor="direccion" opcional>Dirección</Label>
        <Input id="direccion" name="direccion" defaultValue={almacen?.direccion ?? ""} />
      </Field>
      <Field className="flex items-center gap-2.5">
        <input
          id="es_principal"
          type="checkbox"
          checked={esPrincipal}
          onChange={(e) => setEsPrincipal(e.target.checked)}
          className="h-5 w-5 accent-rose-700"
        />
        <Label htmlFor="es_principal" className="mb-0!">Almacén principal (el que sugiere la Caja)</Label>
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
      <Button type="submit" className="mt-2" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "crear" ? "Crear almacén" : "Guardar"}
      </Button>
    </form>
  );
}
