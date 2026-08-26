import { exigirUsuario } from "@/lib/auth";
import { PanelNav } from "@/components/layout/PanelNav";
import { TopBar } from "@/components/layout/TopBar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";

  return (
    <div className="min-h-screen bg-bg">
      <PanelNav esAdmin={esAdmin} />
      <div className="sm:pl-56 print:pl-0">
        <TopBar nombre={usuario.nombre} rol={usuario.rol} />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:pb-10 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
