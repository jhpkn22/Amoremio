import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types/database";
import { redirect } from "next/navigation";

/** Trae la sesión + el perfil (rol incluido) del usuario logueado. */
export async function getUsuarioActual(): Promise<{
  authId: string;
  email: string | null;
  usuario: Usuario;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!usuario) return null;

  return { authId: user.id, email: user.email ?? null, usuario: usuario as Usuario };
}

/** Para Server Components/Actions que exigen sesión + (opcionalmente) rol admin. */
export async function exigirUsuario(opts?: { soloAdmin?: boolean }) {
  const sesion = await getUsuarioActual();
  if (!sesion) redirect("/login");
  if (opts?.soloAdmin && sesion.usuario.rol !== "admin") redirect("/panel/caja");
  return sesion;
}
