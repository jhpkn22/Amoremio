"use client";

import { useState } from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlmacenForm } from "./AlmacenForm";
import type { Almacen } from "@/lib/types/database";

export function AlmacenesManager({ almacenes }: { almacenes: Almacen[] }) {
  const [creando, setCreando] = useState(almacenes.length === 0);
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {creando ? (
        <Card>
          <p className="mb-3 text-[14px] font-bold text-ink-900">Nuevo almacén</p>
          <AlmacenForm onListo={() => setCreando(false)} />
          <button
            onClick={() => setCreando(false)}
            className="mt-2 text-[13px] font-semibold text-ink-600"
            type="button"
          >
            Cancelar
          </button>
        </Card>
      ) : (
        <Button onClick={() => setCreando(true)} variante="secundario">
          <Plus size={16} /> Nuevo almacén
        </Button>
      )}

      <div className="flex flex-col gap-2">
        {almacenes.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
                  {a.nombre}
                  {a.es_principal && <Star size={13} className="fill-rose-400 text-rose-400" />}
                  {!a.activo && <span className="text-[11px] font-normal text-ink-600">(inactivo)</span>}
                </p>
                {a.direccion && <p className="text-[12.5px] text-ink-600">{a.direccion}</p>}
              </div>
              <button
                onClick={() => setEditando(editando === a.id ? null : a.id)}
                className="rounded-lg border border-border p-1.5 text-ink-600 hover:bg-rose-50"
                aria-label={`Editar ${a.nombre}`}
              >
                <Pencil size={15} />
              </button>
            </div>
            {editando === a.id && (
              <div className="mt-3 border-t border-border pt-3">
                <AlmacenForm almacen={a} onListo={() => setEditando(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
