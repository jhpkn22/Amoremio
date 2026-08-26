"use client";

/**
 * Las dos rutas de impresión que pide el brief:
 *  1. Web Bluetooth (navigator.bluetooth) — nativo del navegador, pero
 *     frágil: solo Chrome/Edge en Android, y hay que adivinar el
 *     servicio BLE del módulo impresor porque el fabricante del clon
 *     genérico no publica una ficha técnica completa (ver la nota del
 *     plan de diseño). Probamos los dos UUID de servicio más comunes
 *     entre impresoras térmicas BLE de 58mm "compatible ESC/POS".
 *  2. RawBT (rawbt:) — esquema de URL de la app puente RawBT, que sí
 *     tiene sus propios drivers por modelo y es mucho menos frágil.
 *     Esta ruta existe pura y exclusivamente por eso.
 *
 * Cuál se usa lo decide la configuración (tabla `configuracion`,
 * clave ticket_ruta_impresion) — nunca queda hardcodeado.
 */

export type RutaImpresion = "web_bluetooth" | "rawbt";

const CLAVE_DISPOSITIVO = "amoremio_impresora_bt_id";

// Candidatos de servicio/característica BLE de escritura, en orden de
// prueba. Si tu impresora real no imprime por acá, es la primera cosa
// para revisar (con una app como "nRF Connect" se ve el UUID real).
const CANDIDATOS_BLE = [
  { servicio: "000018f0-0000-1000-8000-00805f9b34fb", caracteristica: "00002af1-0000-1000-8000-00805f9b34fb" },
  { servicio: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", caracteristica: "6e400002-b5a3-f393-e0a9-e50e24dcca9e" },
];

export class ErrorImpresion extends Error {}

function soportaWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

async function obtenerCaracteristicaEscritura(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTCharacteristic> {
  for (const candidato of CANDIDATOS_BLE) {
    try {
      const servicio = await server.getPrimaryService(candidato.servicio);
      const caracteristica = await servicio.getCharacteristic(candidato.caracteristica);
      return caracteristica;
    } catch {
      // probamos el siguiente candidato
    }
  }
  throw new ErrorImpresion(
    "No encontramos el servicio de impresión en este dispositivo Bluetooth. Probá la ruta RawBT desde Configuración."
  );
}

/** Emparejar (o reconectar sin pedir de nuevo, si el navegador lo recuerda) e imprimir. */
export async function imprimirPorWebBluetooth(bytes: Uint8Array): Promise<void> {
  if (!soportaWebBluetooth()) {
    throw new ErrorImpresion("Este navegador no soporta Bluetooth web. Usá Chrome en Android, o cambiá a la ruta RawBT.");
  }

  let device: BluetoothDevice | undefined;
  const idGuardado = localStorage.getItem(CLAVE_DISPOSITIVO);

  // Chrome permite recuperar dispositivos ya emparejados sin volver a
  // pedir permiso, si el usuario los autorizó antes.
  if (idGuardado && "getDevices" in navigator.bluetooth) {
    const dispositivos = await navigator.bluetooth.getDevices();
    device = dispositivos.find((d) => d.id === idGuardado);
  }

  if (!device) {
    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: CANDIDATOS_BLE.map((c) => c.servicio),
      });
    } catch {
      throw new ErrorImpresion("No se eligió ninguna impresora Bluetooth.");
    }
    localStorage.setItem(CLAVE_DISPOSITIVO, device.id);
  }

  try {
    const server = await device.gatt?.connect();
    if (!server) throw new ErrorImpresion("No se pudo conectar con la impresora. Revisá que esté encendida y emparejada por Bluetooth.");

    const caracteristica = await obtenerCaracteristicaEscritura(server);

    // BLE tiene un límite de tamaño por escritura — mandamos de a
    // pedacitos para no perder bytes en impresoras con MTU chico.
    const TAMAÑO_BLOQUE = 100;
    for (let i = 0; i < bytes.length; i += TAMAÑO_BLOQUE) {
      const bloque = bytes.slice(i, i + TAMAÑO_BLOQUE);
      if (caracteristica.properties.writeWithoutResponse) {
        await caracteristica.writeValueWithoutResponse(bloque);
      } else {
        await caracteristica.writeValue(bloque);
      }
    }
  } catch (e) {
    if (e instanceof ErrorImpresion) throw e;
    throw new ErrorImpresion("No se pudo conectar con la impresora. Revisá que esté encendida y emparejada por Bluetooth.");
  }
}

/** RawBT: le pasamos el buffer ESC/POS crudo en base64 por su esquema de URL. */
export function imprimirPorRawBT(bytes: Uint8Array): void {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  const base64 = btoa(binario);

  const link = document.createElement("a");
  link.href = `rawbt:base64,${base64}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function imprimir(bytes: Uint8Array, ruta: RutaImpresion): Promise<void> {
  if (ruta === "rawbt") {
    imprimirPorRawBT(bytes);
    return;
  }
  await imprimirPorWebBluetooth(bytes);
}

export function olvidarImpresoraEmparejada() {
  localStorage.removeItem(CLAVE_DISPOSITIVO);
}

export function hayImpresoraGuardada(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(CLAVE_DISPOSITIVO);
}
