"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface ItemCarritoWeb {
  producto_id: string;
  nombre: string;
  codigo_interno: string;
  precio_unitario: number;
  cantidad: number;
  foto: string | null;
}

interface CarritoContextValor {
  items: ItemCarritoWeb[];
  cantidadTotal: number;
  total: number;
  abierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  agregar: (item: Omit<ItemCarritoWeb, "cantidad">, cantidad?: number) => void;
  quitar: (producto_id: string) => void;
  actualizarCantidad: (producto_id: string, cantidad: number) => void;
  vaciar: () => void;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

const CLAVE_STORAGE = "amoremio_carrito";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarritoWeb[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);

  // Carga inicial desde localStorage (una sola vez, en el cliente).
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      if (guardado) setItems(JSON.parse(guardado));
    } catch {
      // localStorage puede fallar (modo privado, storage lleno, etc.) — el carrito arranca vacío.
    }
    setCargado(true);
  }, []);

  // Persiste cada cambio, una vez que ya se hizo la carga inicial (para no pisarla con []).
  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      // si falla el guardado, el carrito sigue funcionando en memoria para esta sesión.
    }
  }, [items, cargado]);

  const agregar = useCallback((item: Omit<ItemCarritoWeb, "cantidad">, cantidad = 1) => {
    setItems((prev) => {
      const existente = prev.find((p) => p.producto_id === item.producto_id);
      if (existente) {
        return prev.map((p) =>
          p.producto_id === item.producto_id ? { ...p, cantidad: p.cantidad + cantidad } : p
        );
      }
      return [...prev, { ...item, cantidad }];
    });
  }, []);

  const quitar = useCallback((producto_id: string) => {
    setItems((prev) => prev.filter((p) => p.producto_id !== producto_id));
  }, []);

  const actualizarCantidad = useCallback((producto_id: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((p) => p.producto_id !== producto_id));
      return;
    }
    setItems((prev) => prev.map((p) => (p.producto_id === producto_id ? { ...p, cantidad } : p)));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const cantidadTotal = useMemo(() => items.reduce((acc, i) => acc + i.cantidad, 0), [items]);
  const total = useMemo(() => items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0), [items]);

  const valor: CarritoContextValor = {
    items,
    cantidadTotal,
    total,
    abierto,
    abrirCarrito: () => setAbierto(true),
    cerrarCarrito: () => setAbierto(false),
    agregar,
    quitar,
    actualizarCantidad,
    vaciar,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CartProvider>");
  return ctx;
}
