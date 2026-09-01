"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Label, Input, Textarea, CampoError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { crearCliente, actualizarCliente } from "@/app/panel/clientes/actions";
import type { Cliente } from "@/lib/types/database";

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const modo = cliente ? "editar" : "crear";
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const datos = {
      nombre: String(form.get("nombre") || ""),
      telefono: String(form.get("telefono") || "") || null,
      documento: String(form.get("documento") || "") || null,
      limite_credito: form.get("limite_credito") ? Number(form.get("limite_credito")) : null,
      notas: String(form.get("notas") || "") || null,
    };
    const res = modo === "crear" ? await crearCliente(datos) : await actualizarCliente(cliente!.id, datos);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (modo === "crear" && res.id) router.push(`/panel/clientes/${res.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <Field>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required defaultValue={cliente?.nombre} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="telefono" opcional>Teléfono</Label>
          <Input id="telefono" name="telefono" defaultValue={cliente?.telefono ?? ""} placeholder="Para el recordatorio por WhatsApp" />
        </Field>
        <Field>
          <Label htmlFor="documento" opcional>Documento / CI</Label>
          <Input id="documento" name="documento" defaultValue={cliente?.documento ?? ""} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="limite_credito" opcional>Límite de crédito (Gs.)</Label>
        <Input
          id="limite_credito"
          name="limite_credito"
          type="number"
          min={0}
          step={1000}
          defaultValue={cliente?.limite_credito ?? ""}
          className="max-w-[200px]"
        />
      </Field>
      <Field>
        <Label htmlFor="notas" opcional>Notas</Label>
        <Textarea id="notas" name="notas" defaultValue={cliente?.notas ?? ""} />
      </Field>

      <CampoError>{error}</CampoError>

      <Button type="submit" tamaño="grande" className="mt-2 w-full sm:w-auto" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "crear" ? "Crear cliente" : "Guardar cambios"}
      </Button>
    </form>
  );
}
