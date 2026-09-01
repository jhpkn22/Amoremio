"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label, CampoError } from "@/components/ui/Field";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setCargando(false);
    if (error) {
      setError("No pudimos iniciar sesión. Revisá el correo y la contraseña e intentá de nuevo.");
      return;
    }
    router.replace(params.get("volver") || "/panel/caja");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-5xl leading-none text-rose-700">Amore Mío</p>
          <p className="mt-2 text-[13px] font-medium text-ink-600">Panel de gestión — Coronel Bogado</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Field>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@amoremio.com"
            />
          </Field>
          <Field>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <CampoError>{error}</CampoError>
          </Field>
          <Button type="submit" tamaño="grande" className="w-full" disabled={cargando}>
            {cargando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
