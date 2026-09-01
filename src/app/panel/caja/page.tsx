import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AbrirTurnoForm } from "@/components/caja/AbrirTurnoForm";
import { PosCliente } from "@/components/caja/PosCliente";
import type { Almacen, CajaTurno } from "@/lib/types/database";

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
    const { data: almacenes } = await supabase
      .from("almacenes")
      .select("*")
      .is("deleted_at", null)
      .eq("activo", true)
      .order("es_principal", { ascending: false })
      .order("nombre");
    return <AbrirTurnoForm usuarioId={authId} almacenes={(almacenes ?? []) as Almacen[]} />;
  }

  return (
    <PosCliente
      turno={turno}
      almacenId={turno.almacen_id ?? ""}
      usuarioNombre={usuario.nombre}
      esAdmin={usuario.rol === "admin"}
    />
  );
}
