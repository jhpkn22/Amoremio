import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CierreTurnoForm } from "@/components/caja/CierreTurnoForm";
import type { CajaTurno, Venta } from "@/lib/types/database";

export default async function CierreTurnoPage() {
  const { authId, usuario } = await exigirUsuario();
  const supabase = await createClient();

  const { data: turno } = await supabase
    .from("cajas_turno")
    .select("*")
    .eq("usuario_id", authId)
    .eq("estado", "abierto")
    .maybeSingle<CajaTurno>();

  if (!turno) redirect("/panel/caja");

  const { data: ventas } = await supabase
    .from("ventas")
    .select("forma_pago, total")
    .eq("caja_turno_id", turno.id)
    .eq("estado", "confirmada");

  const resumen: Record<string, { cantidad: number; total: number }> = {};
  let totalVentas = 0;
  for (const v of (ventas as Pick<Venta, "forma_pago" | "total">[]) ?? []) {
    resumen[v.forma_pago] = resumen[v.forma_pago] ?? { cantidad: 0, total: 0 };
    resumen[v.forma_pago].cantidad += 1;
    resumen[v.forma_pago].total += v.total;
    totalVentas += v.total;
  }
  const ventasEfectivo = resumen["efectivo"]?.total ?? 0;
  const esperado = turno.monto_inicial + ventasEfectivo;

  return (
    <CierreTurnoForm turno={turno} usuarioNombre={usuario.nombre} resumen={resumen} totalVentas={totalVentas} esperado={esperado} />
  );
}
