import { exigirUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracionImpresora } from "@/components/caja/ConfiguracionImpresora";
import { cargarConfiguracionCaja } from "@/lib/caja/configuracion";

export default async function ConfiguracionCajaPage() {
  const { usuario } = await exigirUsuario();
  const supabase = await createClient();
  const configuracionInicial = await cargarConfiguracionCaja(supabase);

  return <ConfiguracionImpresora esAdmin={usuario.rol === "admin"} configuracionInicial={configuracionInicial} />;
}
