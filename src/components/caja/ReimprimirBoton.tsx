"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cargarConfiguracionCaja } from "@/lib/caja/configuracion";
import { construirTicketVenta, DATOS_NEGOCIO_DEFECTO } from "@/lib/ticket/escpos";
import { imprimir, ErrorImpresion } from "@/lib/ticket/imprimir";
import { Button } from "@/components/ui/Button";
import type { Venta, VentaItem } from "@/lib/types/database";

export function ReimprimirBoton({ venta, items, vendedorNombre }: { venta: Venta; items: VentaItem[]; vendedorNombre: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reimprimir() {
    setEnviando(true);
    setError(null);
    try {
      const supabase = createClient();
      const cfg = await cargarConfiguracionCaja(supabase);
      const bytes = construirTicketVenta(
        {
          numeroTicket: venta.numero_ticket,
          fecha: new Date(venta.created_at),
          vendedorNombre,
          items: items.map((i) => ({
            nombre: i.nombre_producto,
            cantidad: i.cantidad,
            precioUnitario: i.precio_unitario,
            descuentoItem: i.descuento_item,
          })),
          subtotal: venta.subtotal,
          descuentoTotal: venta.descuento_total,
          total: venta.total,
          formaPago: venta.forma_pago,
          efectivoRecibido: venta.efectivo_recibido,
          vuelto: venta.vuelto,
        },
        DATOS_NEGOCIO_DEFECTO,
        cfg.configTicket
      );
      await imprimir(bytes, cfg.rutaImpresion);
    } catch (e) {
      setError(e instanceof ErrorImpresion ? e.message : "No se pudo imprimir. Revisá la impresora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <Button variante="secundario" onClick={reimprimir} disabled={enviando}>
        <Printer size={16} /> {enviando ? "Imprimiendo…" : "Reimprimir ticket"}
      </Button>
      {error && <p className="mt-1.5 text-[12.5px] font-medium text-alert">{error}</p>}
    </div>
  );
}
