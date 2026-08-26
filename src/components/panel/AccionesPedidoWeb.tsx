"use client";

import { useState, useTransition } from "react";
import { descontarStockPedido, marcarProcesadoSinStock, descartarPedido } from "@/app/panel/pedidos-web/actions";

export function AccionesPedidoWeb({ pedidoId }: { pedidoId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await accion();
      if (!res.ok) setError(res.error ?? "Ocurrió un error.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => ejecutar(() => descontarStockPedido(pedidoId))}
          className="min-h-9 rounded-lg bg-rose-700 px-3 text-[12.5px] font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          Descontar stock
        </button>
        <button
          disabled={pending}
          onClick={() => ejecutar(() => marcarProcesadoSinStock(pedidoId))}
          className="min-h-9 rounded-lg border border-border-strong px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Marcar visto, sin descontar
        </button>
        <button
          disabled={pending}
          onClick={() => ejecutar(() => descartarPedido(pedidoId))}
          className="min-h-9 rounded-lg px-3 text-[12.5px] font-semibold text-ink-600 hover:bg-alert-soft hover:text-alert disabled:opacity-50"
        >
          Descartar
        </button>
      </div>
      {error && <p className="text-[12px] text-alert">{error}</p>}
    </div>
  );
}
