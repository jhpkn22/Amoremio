import { create } from "zustand";
import type { FormaPago, ItemCarrito } from "@/lib/types/database";

interface EstadoCarrito {
  items: ItemCarrito[];
  descuentoGlobal: number;
  formaPago: FormaPago;
  clienteId: string | null;
  clienteNombre: string | null;
  efectivoRecibido: number | null;

  agregarItem: (item: Omit<ItemCarrito, "cantidad" | "descuento_item">) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  cambiarPrecio: (clave: string, precio: number) => void;
  cambiarDescuentoItem: (clave: string, monto: number) => void;
  quitarItem: (clave: string) => void;
  setDescuentoGlobal: (monto: number) => void;
  setFormaPago: (forma: FormaPago) => void;
  setCliente: (id: string | null, nombre: string | null) => void;
  setEfectivoRecibido: (monto: number | null) => void;
  limpiar: () => void;

  subtotal: () => number;
  total: () => number;
  vuelto: () => number;
}

export const useCarrito = create<EstadoCarrito>((set, get) => ({
  items: [],
  descuentoGlobal: 0,
  formaPago: "efectivo",
  clienteId: null,
  clienteNombre: null,
  efectivoRecibido: null,

  agregarItem: (nuevo) =>
    set((estado) => {
      const existente = estado.items.find((i) => i.clave === nuevo.clave);
      if (existente) {
        return {
          items: estado.items.map((i) =>
            i.clave === nuevo.clave ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        };
      }
      return { items: [...estado.items, { ...nuevo, cantidad: 1, descuento_item: 0 }] };
    }),

  cambiarCantidad: (clave, cantidad) =>
    set((estado) => ({
      items:
        cantidad <= 0
          ? estado.items.filter((i) => i.clave !== clave)
          : estado.items.map((i) => (i.clave === clave ? { ...i, cantidad } : i)),
    })),

  cambiarPrecio: (clave, precio) =>
    set((estado) => ({
      items: estado.items.map((i) => (i.clave === clave ? { ...i, precio_unitario: Math.max(0, precio) } : i)),
    })),

  cambiarDescuentoItem: (clave, monto) =>
    set((estado) => ({
      items: estado.items.map((i) => (i.clave === clave ? { ...i, descuento_item: Math.max(0, monto) } : i)),
    })),

  quitarItem: (clave) => set((estado) => ({ items: estado.items.filter((i) => i.clave !== clave) })),

  setDescuentoGlobal: (monto) => set({ descuentoGlobal: Math.max(0, monto) }),
  setFormaPago: (forma) => set({ formaPago: forma }),
  setCliente: (id, nombre) => set({ clienteId: id, clienteNombre: nombre }),
  setEfectivoRecibido: (monto) => set({ efectivoRecibido: monto }),

  limpiar: () =>
    set({
      items: [],
      descuentoGlobal: 0,
      formaPago: "efectivo",
      clienteId: null,
      clienteNombre: null,
      efectivoRecibido: null,
    }),

  subtotal: () => get().items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario - i.descuento_item, 0),
  total: () => Math.max(0, get().subtotal() - get().descuentoGlobal),
  vuelto: () => {
    const { efectivoRecibido } = get();
    if (efectivoRecibido == null) return 0;
    return Math.max(0, efectivoRecibido - get().total());
  },
}));
