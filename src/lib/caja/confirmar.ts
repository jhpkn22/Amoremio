import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemCarrito, FormaPago } from "@/lib/types/database";
import { encolarVenta } from "./db";
import { construirTicketVenta, type ConfigTicket, type DatosNegocio } from "@/lib/ticket/escpos";

export interface ParametrosConfirmarVenta {
  supabase: SupabaseClient;
  turnoId: string;
  almacenId: string;
  vendedorNombre: string;
  items: ItemCarrito[];
  descuentoGlobal: number;
  formaPago: FormaPago;
  clienteId: string | null;
  efectivoRecibido: number | null;
}

export interface ResultadoConfirmarVenta {
  offline: boolean;
  numeroTicket: number | null; // null solo si quedó offline (se asigna al sincronizar)
  ticketBytes: Uint8Array;
}

function esErrorDeRed(e: unknown): boolean {
  if (!navigator.onLine) return true;
  const mensaje = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed|fetch/i.test(mensaje);
}

export async function confirmarVentaCaja(
  params: ParametrosConfirmarVenta,
  configTicket: ConfigTicket,
  negocio: DatosNegocio
): Promise<ResultadoConfirmarVenta> {
  const { supabase, turnoId, almacenId, vendedorNombre, items, descuentoGlobal, formaPago, clienteId, efectivoRecibido } =
    params;

  const clientUuid = crypto.randomUUID();
  const subtotal = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario - i.descuento_item, 0);
  const total = Math.max(0, subtotal - descuentoGlobal);

  const payload = {
    p_client_uuid: clientUuid,
    p_caja_turno_id: turnoId,
    p_almacen_id: almacenId,
    p_cliente_id: clienteId,
    p_forma_pago: formaPago,
    p_items: items.map((i) => ({
      articulo_id: i.articulo_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      descuento_item: i.descuento_item,
    })),
    p_descuento_total: descuentoGlobal,
    p_efectivo_recibido: formaPago === "efectivo" ? efectivoRecibido : null,
    p_creada_offline: false,
  };

  const itemsTicket = items.map((i) => ({
    nombre: i.nombre,
    cantidad: i.cantidad,
    precioUnitario: i.precio_unitario,
    descuentoItem: i.descuento_item,
  }));

  let numeroTicket: number | null = null;
  let offline = false;

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.rpc("confirmar_venta_v2", payload);
      if (error) throw error;
      numeroTicket = data?.numero_ticket ?? null;
    } catch (e) {
      if (!esErrorDeRed(e)) throw e; // error real del servidor (validación, permiso): no lo encolamos, se lo mostramos al usuario
      offline = true;
    }
  } else {
    offline = true;
  }

  if (offline) {
    await encolarVenta({
      client_uuid: clientUuid,
      payload: { ...payload, p_creada_offline: true },
      ticket: {
        numeroTicketLocal: Number(String(Date.now()).slice(-6)),
        fecha: new Date().toISOString(),
        vendedorNombre,
        items: itemsTicket,
      },
      creada_en: new Date().toISOString(),
      intentos: 0,
    });
    // avisa al indicador de sincronización que hay algo nuevo en la cola,
    // sin esperar al próximo ciclo de refresco de useSincronizacion
    if (typeof window !== "undefined") window.dispatchEvent(new Event("amoremio:cola-actualizada"));
  }

  const ticketBytes = construirTicketVenta(
    {
      numeroTicket: numeroTicket ?? Number(String(Date.now()).slice(-6)),
      fecha: new Date(),
      vendedorNombre,
      items: itemsTicket,
      subtotal,
      descuentoTotal: descuentoGlobal,
      total,
      formaPago,
      efectivoRecibido,
      vuelto: efectivoRecibido != null ? Math.max(0, efectivoRecibido - total) : null,
    },
    negocio,
    configTicket
  );

  return { offline, numeroTicket, ticketBytes };
}
