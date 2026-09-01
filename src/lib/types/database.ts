// Tipos escritos a mano, en espejo de amoremio-schema.sql.
// Si preferís tipos generados, corré `supabase gen types typescript`
// contra el proyecto una vez migrado y reemplazá este archivo.

export type RolUsuario = "admin" | "vendedora";
export type TipoMovimientoStock = "entrada" | "salida" | "ajuste" | "devolucion";
export type FormaPago = "efectivo" | "transferencia" | "qr" | "fiado";
export type EstadoVenta = "confirmada" | "anulada";
export type EstadoTurno = "abierto" | "cerrado";
export type TipoMovimientoCuenta = "deuda" | "pago";

export interface Usuario {
  id: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  telefono: string | null;
  created_at: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activa: boolean;
  deleted_at: string | null;
}

export interface Producto {
  id: string;
  codigo_interno: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  proveedor: string | null;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  tiene_variantes: boolean;
  visible_en_vitrina: boolean;
  en_oferta: boolean;
  es_a_pedido: boolean;
  dias_demora: number | null;
  opciones_personalizacion: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // relaciones embebidas opcionales (según el select)
  categorias?: Pick<Categoria, "id" | "nombre" | "slug"> | null;
  producto_costos?: { precio_costo: number } | null;
  producto_fotos?: ProductoFoto[];
}

export interface ProductoCosto {
  producto_id: string;
  precio_costo: number;
  updated_at: string;
  updated_by: string | null;
}

export interface Variante {
  id: string;
  producto_id: string;
  talle: string | null;
  color: string | null;
  modelo: string | null;
  codigo_interno: string;
  stock_actual: number;
  stock_minimo: number;
  precio_venta: number | null;
  deleted_at: string | null;
}

export interface ProductoFoto {
  id: string;
  producto_id: string;
  path_original: string;
  path_thumbnail: string | null;
  orden: number;
  created_at: string;
}

export interface MovimientoStock {
  id: string;
  producto_id: string;
  variante_id: string | null;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo: string | null;
  venta_id: string | null;
  usuario_id: string;
  created_at: string;
  usuarios?: Pick<Usuario, "nombre"> | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  documento: string | null;
  notas: string | null;
  limite_credito: number | null;
  saldo_actual: number;
  created_at: string;
  deleted_at: string | null;
}

export interface CajaTurno {
  id: string;
  usuario_id: string;
  almacen_id: string | null;
  monto_inicial: number;
  monto_final_esperado: number | null;
  monto_final_contado: number | null;
  diferencia: number | null;
  estado: EstadoTurno;
  abierto_at: string;
  cerrado_at: string | null;
  usuarios?: Pick<Usuario, "nombre"> | null;
}

export interface Venta {
  id: string;
  numero_ticket: number;
  client_uuid: string | null;
  caja_turno_id: string;
  almacen_id: string | null;
  usuario_id: string;
  cliente_id: string | null;
  forma_pago: FormaPago;
  subtotal: number;
  descuento_total: number;
  total: number;
  efectivo_recibido: number | null;
  vuelto: number | null;
  estado: EstadoVenta;
  anulada_motivo: string | null;
  anulada_por: string | null;
  anulada_at: string | null;
  creada_offline: boolean;
  created_at: string;
  usuarios?: Pick<Usuario, "nombre"> | null;
  clientes?: Pick<Cliente, "id" | "nombre" | "telefono"> | null;
  venta_items?: VentaItem[];
}

export interface VentaItem {
  id: string;
  venta_id: string;
  producto_id: string | null;
  variante_id: string | null;
  articulo_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  descuento_item: number;
  subtotal_item: number;
}

export interface Pago {
  id: string;
  venta_id: string | null;
  cliente_id: string | null;
  forma_pago: FormaPago;
  monto: number;
  vuelto: number | null;
  usuario_id: string;
  created_at: string;
}

export interface CuentaMovimiento {
  id: string;
  cliente_id: string;
  tipo: TipoMovimientoCuenta;
  monto: number;
  venta_id: string | null;
  pago_id: string | null;
  saldo_resultante: number;
  usuario_id: string;
  notas: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Catálogo real (Fase 1) — separado de `productos`/`Producto`, que ahora
// es la "Tienda web" (piezas de muestra para la vitrina).
// ---------------------------------------------------------------------

export type CodigoBarrasOrigen = "fabrica" | "generado" | "asignado" | "sin_codigo";

export interface Articulo {
  id: string;
  codigo_interno: string;
  codigo_barras: string | null;
  codigo_barras_origen: CodigoBarrasOrigen;
  codigo_barras_impreso: boolean;
  nombre: string;
  categoria_id: string | null;
  precio_venta: number;
  precio_lista: number | null;
  descuento_pct: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // relaciones embebidas opcionales (según el select)
  categorias?: Pick<Categoria, "id" | "nombre" | "slug"> | null;
  articulo_costos?: { precio_costo: number } | null;
}

export interface ArticuloCosto {
  articulo_id: string;
  precio_costo: number;
  updated_at: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------
// Proveedores + su cuenta corriente (Fase 2)
// ---------------------------------------------------------------------

export type TipoMovProveedor = "deuda" | "pago";

export interface Proveedor {
  id: string;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  descripcion: string | null;
  saldo: number;
  activo: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface ProveedorMovimiento {
  id: string;
  proveedor_id: string;
  tipo: TipoMovProveedor;
  monto: number;
  compra_id: string | null;
  forma_pago: FormaPago | null;
  saldo_resultante: number;
  usuario_id: string;
  notas: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Almacenes + libro mayor de stock por almacén (Fase 3)
// ---------------------------------------------------------------------

export type TipoMovArticulo = "compra" | "venta" | "ajuste" | "devolucion" | "transferencia";

export interface Almacen {
  id: string;
  nombre: string;
  direccion: string | null;
  es_principal: boolean;
  activo: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface ArticuloStock {
  articulo_id: string;
  almacen_id: string;
  cantidad: number;
}

export interface StockMovimiento {
  id: string;
  articulo_id: string;
  almacen_id: string;
  tipo: TipoMovArticulo;
  cantidad: number;
  motivo: string | null;
  compra_id: string | null;
  venta_id: string | null;
  transferencia_id: string | null;
  usuario_id: string;
  created_at: string;
  articulos?: Pick<Articulo, "nombre" | "codigo_interno"> | null;
  almacenes?: Pick<Almacen, "nombre"> | null;
  usuarios?: Pick<Usuario, "nombre"> | null;
}

// ---------------------------------------------------------------------
// Compras (Fase 4)
// ---------------------------------------------------------------------

export type EstadoCompra = "confirmada" | "anulada";
export type CondicionCompra = "contado" | "credito";

export interface Compra {
  id: string;
  numero: number;
  proveedor_id: string;
  almacen_id: string;
  condicion: CondicionCompra;
  total: number;
  estado: EstadoCompra;
  usuario_id: string;
  created_at: string;
  anulada_motivo: string | null;
  anulada_por: string | null;
  anulada_at: string | null;
  proveedores?: Pick<Proveedor, "nombre"> | null;
  almacenes?: Pick<Almacen, "nombre"> | null;
  compra_items?: CompraItem[];
}

export interface CompraItem {
  id: string;
  compra_id: string;
  articulo_id: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_nuevo: number | null;
  articulos?: Pick<Articulo, "nombre" | "codigo_interno"> | null;
}

/** Item tal como vive en el carrito de la Caja, antes de confirmar la venta. */
export interface ItemCarrito {
  clave: string; // = articulo_id (para sumar cantidad al reescanear)
  articulo_id: string;
  nombre: string;
  codigo: string; // código interno o de barras, para mostrar
  cantidad: number;
  precio_unitario: number;
  precio_original: number; // para saber si hubo override manual
  descuento_item: number;
  stock_disponible: number; // en el almacén del turno
}
