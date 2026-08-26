"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, CampoError } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { formatGs } from "@/lib/utils";

/** Apertura de turno: sin esto no se puede vender (brief, módulo 3). */
export function AbrirTurnoForm({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    const montoInicial = Number(monto);
    if (monto.trim() === "" || !Number.isFinite(montoInicial) || montoInicial < 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error: errIns } = await supabase.from("cajas_turno").insert({ usuario_id: usuarioId, monto_inicial: montoInicial });
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
          Contá el efectivo con el que arrancás y registralo antes de empezar a vender.
        </p>
        <form onSubmit={abrir}>
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
          <Button type="submit" disabled={enviando} tamaño="grande" className="w-full">
            {enviando ? "Abriendo…" : monto ? `Abrir turno con ${formatGs(Number(monto))}` : "Abrir turno"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
