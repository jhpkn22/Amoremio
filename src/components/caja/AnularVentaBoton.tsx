"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Field, CampoError } from "@/components/ui/Field";

/** Anular venta: solo admin (RLS lo exige del lado del servidor también — esto es además, no en vez de). */
export function AnularVentaBoton({ ventaId }: { ventaId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    if (!motivo.trim()) {
      setError("Contá el motivo de la anulación.");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error: errRpc } = await supabase.rpc("anular_venta", { p_venta_id: ventaId, p_motivo: motivo.trim() });
    setEnviando(false);
    if (errRpc) {
      setError(errRpc.message || "No se pudo anular la venta.");
      return;
    }
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button variante="peligro" onClick={() => setAbierto(true)}>
        <Ban size={16} /> Anular venta
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-alert bg-alert-soft p-3.5">
      <p className="mb-2 text-[13.5px] font-semibold text-alert">
        Esto va a devolver el stock vendido y, si era fiado, revertir la deuda del cliente. No se puede deshacer.
      </p>
      <Field className="mb-2.5">
        <Label htmlFor="motivo">Motivo</Label>
        <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: error de carga, cliente se arrepintió…" autoFocus />
        <CampoError>{error}</CampoError>
      </Field>
      <div className="flex gap-2">
        <Button variante="secundario" onClick={() => setAbierto(false)} disabled={enviando}>
          Cancelar
        </Button>
        <Button variante="peligro" onClick={anular} disabled={enviando}>
          {enviando ? "Anulando…" : "Confirmar anulación"}
        </Button>
      </div>
    </div>
  );
}
