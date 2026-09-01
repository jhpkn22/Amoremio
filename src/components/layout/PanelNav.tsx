"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Tag,
  Boxes,
  Truck,
  Factory,
  Sparkles,
  LineChart,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: React.ElementType;
  /** false = la pestaña todavía no está construida (se muestra deshabilitada con "pronto"). */
  listo?: boolean;
  soloAdmin?: boolean;
  /** aparece en la barra inferior del celular (además del menú "Más"). */
  primarioMobile?: boolean;
}

interface Grupo {
  titulo: string;
  soloAdmin?: boolean;
  items: Item[];
}

const grupos: Grupo[] = [
  {
    titulo: "Vender",
    items: [
      { href: "/panel/caja", label: "Caja", icon: ShoppingBag, listo: true, primarioMobile: true },
      { href: "/panel/clientes", label: "Clientes", icon: Users, primarioMobile: true },
      { href: "/panel/cuentas", label: "Deudas", icon: Wallet, listo: true },
    ],
  },
  {
    titulo: "Catálogo",
    items: [
      { href: "/panel/productos", label: "Productos", icon: Tag, primarioMobile: true },
      { href: "/panel/tienda-web", label: "Tienda web", icon: Globe, listo: true },
      { href: "/panel/pedidos-web", label: "Pedidos web", icon: ShoppingCart, listo: true },
    ],
  },
  {
    titulo: "Inventario",
    items: [
      { href: "/panel/stock", label: "Stock", icon: Boxes, primarioMobile: true },
      { href: "/panel/compras", label: "Compras", icon: Truck },
      { href: "/panel/proveedores", label: "Proveedores", icon: Factory },
    ],
  },
  {
    titulo: "Análisis",
    soloAdmin: true,
    items: [
      { href: "/panel/inteligencia", label: "Inteligencia", icon: Sparkles, soloAdmin: true },
      { href: "/panel/graficos", label: "Gráficos", icon: LineChart, soloAdmin: true },
      { href: "/panel/reportes", label: "Reportes", icon: BarChart3, soloAdmin: true, listo: true },
    ],
  },
];

// El subrayado activo es el trazo suelto del signature (plan de diseño,
// sección 6) en vez de una barra plana.
function TrazoActivo() {
  return (
    <svg viewBox="0 0 40 8" className="h-2 w-9 text-rose-700" aria-hidden>
      <path
        d="M2 6 C 6 2, 14 2, 20 5 C 26 7.5, 32 2, 38 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EnlaceLateral({ item, activo }: { item: Item; activo: boolean }) {
  const Icon = item.icon;
  const deshabilitado = !item.listo;
  return (
    <Link
      href={deshabilitado ? "#" : item.href}
      aria-disabled={deshabilitado}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-semibold",
        activo ? "bg-rose-50 text-rose-700" : "text-ink-600 hover:bg-rose-50 hover:text-ink-900",
        deshabilitado && "pointer-events-none opacity-40"
      )}
    >
      <Icon size={18} strokeWidth={2.2} />
      {item.label}
      {deshabilitado && (
        <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
          pronto
        </span>
      )}
    </Link>
  );
}

export function PanelNav({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const gruposVisibles = grupos
    .filter((g) => !g.soloAdmin || esAdmin)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.soloAdmin || esAdmin) }))
    .filter((g) => g.items.length > 0);

  const activo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const primarios = gruposVisibles
    .flatMap((g) => g.items)
    .filter((i) => i.primarioMobile && i.listo)
    .slice(0, 4);

  return (
    <>
      {/* Mobile: barra inferior, zona de pulgar */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Navegación principal"
      >
        {primarios.map((item) => {
          const Icon = item.icon;
          const act = activo(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold",
                act ? "text-rose-700" : "text-ink-600"
              )}
            >
              <Icon size={20} strokeWidth={2.2} />
              {item.label}
              {act ? <TrazoActivo /> : <span className="h-2" />}
            </Link>
          );
        })}
        <button
          onClick={() => setMenuAbierto(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold text-ink-600"
        >
          <Menu size={20} strokeWidth={2.2} />
          Más
          <span className="h-2" />
        </button>
      </nav>

      {/* Mobile: hoja inferior con todo el menú */}
      {menuAbierto && (
        <div className="no-print fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-ink-900/40"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-2xl text-rose-700">Amore Mío</p>
              <button
                onClick={() => setMenuAbierto(false)}
                className="rounded-full p-1.5 text-ink-600 hover:bg-rose-50"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4" onClick={() => setMenuAbierto(false)}>
              {gruposVisibles.map((g) => (
                <div key={g.titulo}>
                  <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-ink-600">{g.titulo}</p>
                  <div className="flex flex-col gap-0.5">
                    {g.items.map((item) => (
                      <EnlaceLateral key={item.href} item={item} activo={activo(item.href)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop/tablet: nav lateral */}
      <nav
        className="no-print fixed inset-y-0 left-0 z-20 hidden w-56 flex-col gap-4 overflow-y-auto border-r border-border bg-surface p-4 sm:flex"
        aria-label="Navegación principal"
      >
        <div className="px-2">
          <p className="font-display text-3xl leading-none text-rose-700">Amore Mío</p>
          <p className="mt-1 text-[12px] font-medium text-ink-600">Panel de gestión</p>
        </div>
        {gruposVisibles.map((g) => (
          <div key={g.titulo}>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-ink-600">{g.titulo}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map((item) => (
                <EnlaceLateral key={item.href} item={item} activo={activo(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
