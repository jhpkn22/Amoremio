"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { marcarCodigoImpreso } from "@/app/panel/productos/actions";

/**
 * Imprime la etiqueta y, la primera vez, marca el código como impreso
 * (lo que congela el código de barras: ya no se puede regenerar/reasignar).
 */
export function BotonImprimirEtiqueta({
  articuloId,
  yaImpreso,
}: {
  articuloId: string;
  yaImpreso: boolean;
}) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);

  async function imprimir() {
    if (!yaImpreso) {
      const ok = window.confirm(
        "Al imprimir, el código de barras queda fijo y no se va a poder regenerar ni reasignar. ¿Continuar?"
      );
      if (!ok) return;
      setTrabajando(true);
      const res = await marcarCodigoImpreso(articuloId);
      setTrabajando(false);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      router.refresh();
    }
    window.print();
  }

  return (
    <Button onClick={imprimir} disabled={trabajando} className="no-print">
      <Printer size={18} /> {trabajando ? "Preparando…" : "Imprimir etiqueta"}
    </Button>
  );
}
