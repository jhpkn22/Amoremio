"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { anularCompra } from "@/app/panel/compras/actions";

export function AnularCompraBoton({ compraId }: { compraId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    if (!motivo.trim()) {
      setError("Poné un motivo.");
      return;
    }
    setEnviando(true);
    setError(null);
    const res = await anularCompra(compraId, motivo.trim());
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button variante="secundario" onClick={() => setAbierto(true)}>
        <Ban size={16} /> Anular compra
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-alert bg-alert-soft p-3">
      <p className="mb-2 text-[13px] font-semibold text-alert">
        Anular devuelve el stock que había entrado y revierte la deuda si era a crédito.
      </p>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo de la anulación"
        className="mb-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] focus:outline-none"
      />
      {error && <p className="mb-2 text-[12.5px] font-medium text-alert">{error}</p>}
      <div className="flex gap-2">
        <Button variante="peligro" onClick={anular} disabled={enviando}>
          {enviando ? "Anulando…" : "Confirmar anulación"}
        </Button>
        <Button variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
