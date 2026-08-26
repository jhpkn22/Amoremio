"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes de cliente ("use client"). Usa la anon key:
// todo lo que puede o no puede hacer lo decide RLS del lado del server,
// nunca esta llave.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
