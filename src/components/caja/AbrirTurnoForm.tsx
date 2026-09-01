"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, Select, CampoError } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { formatGs } from "@/lib/utils";
import type { Almacen } from "@/lib/types/database";

/** Apertura de turno: sin esto no se puede vender (brief, módulo 3). */
export function AbrirTurnoForm({ usuarioId, almacenes }: { usuarioId: string; almacenes: Almacen[] }) {
  const router = useRouter();
  const [monto, setMonto] = useState("");
  const [almacenId, setAlmacenId] = useState(
    almacenes.find((a) => a.es_principal)?.id ?? almacenes[0]?.id ?? ""
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    const montoInicial = Number(monto);
    if (monto.trim() === "" || !Number.isFinite(montoInicial) || montoInicial < 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!almacenId) {
      setError("Elegí de qué almacén vas a vender.");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error: errIns } = await supabase
      .from("cajas_turno")
      .insert({ usuario_id: usuarioId, monto_inicial: montoInicial, almacen_id: almacenId });
    if (errIns) {
      setEnviando(false);
      setError("No se pudo abrir el turno. Intentá de nuevo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <h1 className="mb-1 text-[20px] font-bold text-ink-900">Abrir turno de caja</h1>
        <p className="mb-5 text-[13.5px] text-ink-600">
          Contá el efectivo con el que arrancás y elegí de qué almacén salen las ventas.
        </p>
        <form onSubmit={abrir}>
          <Field>
            <Label htmlFor="almacen">Almacén</Label>
            <Select id="almacen" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
              {almacenes.length === 0 && <option value="">— creá un almacén primero —</option>}
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="monto">Monto inicial en caja</Label>
            <Input
              id="monto"
              type="number"
              min={0}
              inputMode="numeric"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
            />
            <CampoError>{error}</CampoError>
          </Field>
          <Button type="submit" disabled={enviando || almacenes.length === 0} tamaño="grande" className="w-full">
            {enviando ? "Abriendo…" : monto ? `Abrir turno con ${formatGs(Number(monto))}` : "Abrir turno"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
