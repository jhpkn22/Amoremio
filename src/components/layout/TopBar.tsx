"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TopBar({ nombre, rol }: { nombre: string; rol: string }) {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 sm:hidden">
        <Image src="/logo.png" alt="Amore Mío" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
        <p className="font-display text-2xl leading-none text-rose-700">Amore Mío</p>
      </div>
      <div className="hidden sm:block" />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[13px] font-semibold leading-tight text-ink-900">{nombre}</p>
          <p className="text-[11px] leading-tight text-ink-600">{rol === "admin" ? "Administradora" : "Vendedora"}</p>
        </div>
        <button
          onClick={salir}
          aria-label="Cerrar sesión"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 hover:bg-rose-50 hover:text-alert"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
