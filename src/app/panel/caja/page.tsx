import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AbrirTurnoForm } from "@/components/caja/AbrirTurnoForm";
import { PosCliente } from "@/components/caja/PosCliente";
import type { CajaTurno } from "@/lib/types/database";

export default async function CajaPage() {
  const { authId, usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from("cajas_turno")
    .select("*")
    .eq("usuario_id", authId)
    .eq("estado", "abierto")
    .maybeSingle<CajaTurno>();

  if (!turno) {
    return <AbrirTurnoForm usuarioId={authId} />;
  }

  return <PosCliente turno={turno} usuarioNombre={usuario.nombre} esAdmin={usuario.rol === "admin"} />;
}
