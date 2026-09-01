import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Cola de ventas pendientes de sincronizar — el corazón de "la Caja
 * sigue funcionando si se cae internet" (brief, módulo 3). Una venta
 * confirmada localmente se guarda acá SIEMPRE primero; si hay señal
 * se sincroniza al toque, si no, queda esperando al próximo intento.
 */

export interface PayloadVentaV2 {
  p_client_uuid: string;
  p_caja_turno_id: string;
  p_almacen_id: string;
  p_cliente_id: string | null;
  p_forma_pago: string;
  p_items: {
    articulo_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento_item: number;
  }[];
  p_descuento_total: number;
  p_efectivo_recibido: number | null;
  p_creada_offline: boolean;
}

// Forma vieja (ventas sobre `productos`), por si quedó algo encolado antes del rework.
export interface PayloadVentaV1 {
  p_client_uuid: string;
  p_caja_turno_id: string;
  p_cliente_id: string | null;
  p_forma_pago: string;
  p_items: { producto_id: string; variante_id: string | null; cantidad: number; precio_unitario: number; descuento_item: number }[];
  p_descuento_total: number;
  p_efectivo_recibido: number | null;
  p_creada_offline: boolean;
}

export interface VentaPendiente {
  client_uuid: string; // clave de idempotencia — evita duplicar si se reintenta
  payload: PayloadVentaV2 | PayloadVentaV1;
  ticket: {
    numeroTicketLocal: number;
    fecha: string;
    vendedorNombre: string;
    items: { nombre: string; cantidad: number; precioUnitario: number; descuentoItem: number }[];
  };
  creada_en: string;
  intentos: number;
  ultimo_error?: string;
}

export function esPayloadV2(p: PayloadVentaV2 | PayloadVentaV1): p is PayloadVentaV2 {
  return "p_almacen_id" in p;
}

interface AmoremioDB extends DBSchema {
  cola_ventas: {
    key: string;
    value: VentaPendiente;
  };
}

let dbPromise: Promise<IDBPDatabase<AmoremioDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AmoremioDB>("amoremio-caja", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("cola_ventas", { keyPath: "client_uuid" });
        }
        // v1 -> v2: el store no cambia de forma; los payloads viejos que
        // hayan quedado se sincronizan igual (sync.ts elige la RPC).
      },
    });
  }
  return dbPromise;
}

export async function encolarVenta(venta: VentaPendiente) {
  const db = await getDB();
  await db.put("cola_ventas", venta);
}

export async function listarPendientes(): Promise<VentaPendiente[]> {
  const db = await getDB();
  return db.getAll("cola_ventas");
}

export async function contarPendientes(): Promise<number> {
  const db = await getDB();
  return db.count("cola_ventas");
}

export async function quitarDeLaCola(client_uuid: string) {
  const db = await getDB();
  await db.delete("cola_ventas", client_uuid);
}

export async function actualizarIntento(client_uuid: string, error: string) {
  const db = await getDB();
  const actual = await db.get("cola_ventas", client_uuid);
  if (!actual) return;
  actual.intentos += 1;
  actual.ultimo_error = error;
  await db.put("cola_ventas", actual);
}
