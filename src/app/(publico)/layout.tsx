import { createClient } from "@/lib/supabase/server";
import { obtenerWhatsAppLocal } from "@/lib/vitrina/configuracion";
import { HeaderPublico } from "@/components/vitrina/HeaderPublico";
import { FooterPublico } from "@/components/vitrina/FooterPublico";
import { CartProvider } from "@/lib/carrito/CartContext";
import { CartDrawer } from "@/components/vitrina/CartDrawer";

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const numeroWhatsApp = await obtenerWhatsAppLocal(supabase);

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <HeaderPublico />
        <main className="flex-1">{children}</main>
        <FooterPublico numeroWhatsApp={numeroWhatsApp} />
      </div>
      <CartDrawer numeroWhatsApp={numeroWhatsApp} />
    </CartProvider>
  );
}
