import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Cola de ventas pendientes de sincronizar — el corazón de "la Caja
 * sigue funcionando si se cae internet" (brief, módulo 3). Una venta
 * confirmada localmente se guarda acá SIEMPRE primero; si hay señal
 * se sincroniza al toque, si no, queda esperando al próximo intento.
 */

export interface VentaPendiente {
  client_uuid: string; // clave de idempotencia — evita duplicar si se reintenta
  payload: {
    p_client_uuid: string;
    p_caja_turno_id: string;
    p_cliente_id: string | null;
    p_forma_pago: string;
    p_items: {
      producto_id: string;
      variante_id: string | null;
      cantidad: number;
      precio_unitario: number;
      descuento_item: number;
    }[];
    p_descuento_total: number;
    p_efectivo_recibido: number | null;
    p_creada_offline: boolean;
  };
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

interface AmoremioDB extends DBSchema {
  cola_ventas: {
    key: string;
    value: VentaPendiente;
  };
}

let dbPromise: Promise<IDBPDatabase<AmoremioDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AmoremioDB>("amoremio-caja", 1, {
      upgrade(db) {
        db.createObjectStore("cola_ventas", { keyPath: "client_uuid" });
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
