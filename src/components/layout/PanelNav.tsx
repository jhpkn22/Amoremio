"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ShoppingBag, Wallet, BarChart3, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: React.ElementType;
  soloAdmin?: boolean;
  proximamente?: boolean;
}

const items: Item[] = [
  { href: "/panel/stock", label: "Stock", icon: Boxes },
  { href: "/panel/caja", label: "Caja", icon: ShoppingBag },
  { href: "/panel/pedidos-web", label: "Pedidos web", icon: ShoppingCart },
  { href: "/panel/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/panel/reportes", label: "Reportes", icon: BarChart3, soloAdmin: true },
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

export function PanelNav({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();
  const visibles = items.filter((i) => !i.soloAdmin || esAdmin);

  return (
    <>
      {/* Mobile: barra inferior, zona de pulgar */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Navegación principal"
      >
        {visibles.map((item) => {
          const activo = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.proximamente ? "#" : item.href}
              aria-disabled={item.proximamente}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold",
                activo ? "text-rose-700" : "text-ink-600",
                item.proximamente && "pointer-events-none opacity-40"
              )}
            >
              <Icon size={20} strokeWidth={2.2} />
              {item.label}
              {activo ? <TrazoActivo /> : <span className="h-2" />}
            </Link>
          );
        })}
      </nav>

      {/* Desktop/tablet: nav lateral */}
      <nav
        className="no-print fixed inset-y-0 left-0 z-20 hidden w-56 flex-col gap-1 border-r border-border bg-surface p-4 sm:flex"
        aria-label="Navegación principal"
      >
        <div className="mb-6 px-2">
          <p className="font-display text-3xl leading-none text-rose-700">Amore Mío</p>
          <p className="mt-1 text-[12px] font-medium text-ink-600">Panel de gestión</p>
        </div>
        {visibles.map((item) => {
          const activo = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.proximamente ? "#" : item.href}
              aria-disabled={item.proximamente}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold",
                activo ? "bg-rose-50 text-rose-700" : "text-ink-600 hover:bg-rose-50 hover:text-ink-900",
                item.proximamente && "pointer-events-none opacity-40"
              )}
            >
              <Icon size={18} strokeWidth={2.2} />
              {item.label}
              {item.proximamente && (
                <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
                  pronto
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
