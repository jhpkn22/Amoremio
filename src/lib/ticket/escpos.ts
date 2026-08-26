/**
 * Constructor de comandos ESC/POS crudos para la térmica Bluetooth de
 * 58mm (Dronic P503A y clones equivalentes — ver la nota técnica del
 * plan de diseño: la tabla de comandos exacta del modelo físico se
 * verifica en cancha, esto sigue el estándar Epson ESC/POS que usan
 * prácticamente todos los clones de 58mm vendidos como "compatible
 * ESC/POS", que es la base documentada para el P503A).
 *
 * Nada de PDF ni window.print(): esto arma el buffer de bytes tal
 * cual lo pide el brief.
 */

// ---- Códigos de control ------------------------------------------------
const ESC = 0x1b;
const GS = 0x1d;

// ---- Página de códigos para tildes y ñ ---------------------------------
// CP850 (multilingüe latino) — cubre á é í ó ú ñ Ñ Á É Í Ó Ú ü Ü ¿ ¡.
// `ESC t 2` selecciona CP850 en el juego de comandos Epson estándar que
// siguen estos clones. Si en la impresora real da caracteres raros, es
// cuestión de cambiar este número (ver configuración → prueba de impresión).
const CODEPAGE_CP850 = 2;

const MAPA_CP850: Record<string, number> = {
  á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3,
  Á: 0xb5, É: 0x90, Í: 0xd6, Ó: 0xe0, Ú: 0xe9,
  ñ: 0xa4, Ñ: 0xa5, ü: 0x81, Ü: 0x9a,
  "¿": 0xa8, "¡": 0xad,
};

function textoABytes(texto: string): number[] {
  const bytes: number[] = [];
  for (const char of texto) {
    const especial = MAPA_CP850[char];
    if (especial !== undefined) {
      bytes.push(especial);
    } else {
      const codigo = char.codePointAt(0) ?? 63;
      // ASCII imprimible pasa directo; cualquier otra cosa que no
      // sepamos mapear se reemplaza por "?" en vez de mandar basura.
      bytes.push(codigo >= 0x20 && codigo <= 0x7e ? codigo : 0x3f);
    }
  }
  return bytes;
}

export interface ConfigTicket {
  anchoMm: 58 | 80;
  charsPorLinea: number; // 32 en fuente A a 58mm, 48 en fuente B — configurable, no hardcodeado
}

export const CONFIG_TICKET_DEFECTO: ConfigTicket = { anchoMm: 58, charsPorLinea: 32 };

type Alineacion = "izquierda" | "centro" | "derecha";

export class TicketBuilder {
  private bytes: number[] = [];
  private ancho: number;

  constructor(config: ConfigTicket = CONFIG_TICKET_DEFECTO) {
    this.ancho = config.charsPorLinea;
    this.bytes.push(ESC, 0x40); // ESC @ — inicializa la impresora
    this.bytes.push(ESC, 0x74, CODEPAGE_CP850);
  }

  alinear(a: Alineacion) {
    const n = a === "izquierda" ? 0 : a === "centro" ? 1 : 2;
    this.bytes.push(ESC, 0x61, n);
    return this;
  }

  negrita(activar: boolean) {
    this.bytes.push(ESC, 0x45, activar ? 1 : 0);
    return this;
  }

  /** Duplica ancho/alto — para el TOTAL o el título, con moderación. */
  tamañoDoble(activar: boolean) {
    this.bytes.push(GS, 0x21, activar ? 0x11 : 0x00);
    return this;
  }

  linea(texto = "") {
    this.bytes.push(...textoABytes(texto), 0x0a);
    return this;
  }

  /** Línea separadora del ancho configurado (guiones, como en el brief). */
  separador(char = "-") {
    return this.linea(char.repeat(this.ancho));
  }

  /**
   * Dos columnas alineadas — precio a la derecha. Si la izquierda no
   * entra junto con la derecha, sigue en una línea propia y el precio
   * queda solo en la última (así los nombres largos se parten en dos
   * líneas en vez de comerse la columna de precio).
   */
  dosColumnas(izquierda: string, derecha: string) {
    const anchoDerecha = derecha.length;
    const espacioIzquierda = this.ancho - anchoDerecha - 1;

    if (espacioIzquierda >= 1 && izquierda.length <= espacioIzquierda) {
      const relleno = " ".repeat(this.ancho - izquierda.length - anchoDerecha);
      return this.linea(izquierda + relleno + derecha);
    }

    // no entra junto: el texto va en su propia línea (partido si hace
    // falta) y el importe queda pegado a la derecha en la última.
    this.linea(izquierda);
    const relleno = " ".repeat(Math.max(0, this.ancho - anchoDerecha));
    return this.linea(relleno + derecha);
  }

  feed(lineas = 1) {
    this.bytes.push(...Array(lineas).fill(0x0a));
    return this;
  }

  /** GS V — corte (parcial si el modelo lo soporta; si no, avanza y ya). */
  cortar() {
    this.feed(2);
    this.bytes.push(GS, 0x56, 0x01);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// ---- Formato de moneda para el ticket (sin "Gs." salvo en el TOTAL,
// tal cual la plantilla del brief) --------------------------------------
function nro(valor: number): string {
  return Math.round(valor).toLocaleString("es-PY");
}

export interface DatosTicketVenta {
  numeroTicket: number;
  fecha: Date;
  vendedorNombre: string;
  items: { nombre: string; cantidad: number; precioUnitario: number; descuentoItem: number }[];
  subtotal: number;
  descuentoTotal: number;
  total: number;
  formaPago: string;
  efectivoRecibido?: number | null;
  vuelto?: number | null;
}

export interface DatosNegocio {
  nombre: string;
  eslogan: string;
  direccion: string;
  telefono: string;
}

export const DATOS_NEGOCIO_DEFECTO: DatosNegocio = {
  nombre: "AMORE MIO",
  eslogan: "Regalos Personalizados",
  direccion: "Coronel Bogado - Itapúa",
  telefono: "",
};

export function construirTicketVenta(
  datos: DatosTicketVenta,
  negocio: DatosNegocio = DATOS_NEGOCIO_DEFECTO,
  config: ConfigTicket = CONFIG_TICKET_DEFECTO
): Uint8Array {
  const t = new TicketBuilder(config);

  t.alinear("centro").negrita(true).linea(negocio.nombre).negrita(false);
  t.linea(negocio.eslogan);
  t.linea(negocio.direccion);
  if (negocio.telefono) t.linea(`Tel: ${negocio.telefono}`);
  t.separador();

  t.alinear("izquierda");
  t.linea(`Ticket Nº ${String(datos.numeroTicket).padStart(6, "0")}`);
  const fechaStr = datos.fecha.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaStr = datos.fecha.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", hour12: false });
  t.linea(`${fechaStr}  ${horaStr}   Vend: ${datos.vendedorNombre}`);
  t.separador();

  for (const item of datos.items) {
    t.linea(`${item.cantidad} x ${item.nombre}`);
    const importe = item.cantidad * item.precioUnitario - item.descuentoItem;
    t.dosColumnas("", nro(importe));
  }
  t.separador();

  t.dosColumnas("Subtotal", nro(datos.subtotal));
  if (datos.descuentoTotal > 0) t.dosColumnas("Descuento", `-${nro(datos.descuentoTotal)}`);
  t.negrita(true);
  t.dosColumnas("TOTAL", `Gs. ${nro(datos.total)}`);
  t.negrita(false);
  t.separador();

  const etiquetasFormaPago: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    qr: "QR",
    fiado: "Fiado",
  };
  t.dosColumnas(etiquetasFormaPago[datos.formaPago] ?? datos.formaPago, nro(datos.total));
  if (datos.formaPago === "efectivo" && datos.efectivoRecibido != null) {
    t.dosColumnas("Recibido", nro(datos.efectivoRecibido));
    t.dosColumnas("Vuelto", nro(datos.vuelto ?? 0));
  }
  t.separador();

  t.alinear("centro");
  t.linea("Comprobante interno.");
  t.linea("No válido como factura.");
  t.feed(1);
  t.linea("¡Gracias por tu compra!");

  t.cortar();
  return t.toBytes();
}

export interface DatosCierreTurno {
  vendedorNombre: string;
  abiertoAt: Date;
  cerradoAt: Date;
  montoInicial: number;
  ventasPorFormaPago: Record<string, { cantidad: number; total: number }>;
  totalVentas: number;
  montoFinalEsperado: number;
  montoFinalContado: number;
  diferencia: number;
}

export function construirTicketCierreTurno(
  datos: DatosCierreTurno,
  negocio: DatosNegocio = DATOS_NEGOCIO_DEFECTO,
  config: ConfigTicket = CONFIG_TICKET_DEFECTO
): Uint8Array {
  const t = new TicketBuilder(config);

  t.alinear("centro").negrita(true).linea(negocio.nombre).negrita(false);
  t.linea("Cierre de caja");
  t.separador();

  t.alinear("izquierda");
  t.linea(`Vendedor/a: ${datos.vendedorNombre}`);
  t.linea(`Apertura: ${datos.abiertoAt.toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}`);
  t.linea(`Cierre:   ${datos.cerradoAt.toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}`);
  t.separador();

  t.dosColumnas("Monto inicial", nro(datos.montoInicial));
  for (const [forma, resumen] of Object.entries(datos.ventasPorFormaPago)) {
    t.dosColumnas(`${forma} (${resumen.cantidad})`, nro(resumen.total));
  }
  t.dosColumnas("Total vendido", nro(datos.totalVentas));
  t.separador();

  t.dosColumnas("Esperado en caja", nro(datos.montoFinalEsperado));
  t.dosColumnas("Contado", nro(datos.montoFinalContado));
  t.negrita(true);
  t.dosColumnas("Diferencia", `${datos.diferencia >= 0 ? "+" : ""}${nro(datos.diferencia)}`);
  t.negrita(false);
  t.separador();

  t.alinear("centro");
  t.linea("Comprobante interno de cierre.");

  t.cortar();
  return t.toBytes();
}

export function construirTicketPrueba(
  negocio: DatosNegocio = DATOS_NEGOCIO_DEFECTO,
  config: ConfigTicket = CONFIG_TICKET_DEFECTO
): Uint8Array {
  const t = new TicketBuilder(config);
  t.alinear("centro").negrita(true).linea(negocio.nombre).negrita(false);
  t.linea("Prueba de impresión");
  t.separador();
  t.alinear("izquierda");
  t.linea("Tildes: á é í ó ú");
  t.linea("Eñe: ñ Ñ");
  t.linea(`Ancho configurado: ${config.charsPorLinea} caracteres`);
  t.dosColumnas("Columna izquierda", "Derecha");
  t.separador();
  t.alinear("centro");
  t.linea("Si ves esto bien, ¡la impresora");
  t.linea("está lista para vender!");
  t.cortar();
  return t.toBytes();
}
