/** Gs. 85.000 — sin decimales, punto como separador de miles (brief, punto 1). */
export function formatGs(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return "Gs. " + Math.round(valor).toLocaleString("es-PY");
}

export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}

/**
 * URL pública canónica del sitio (sin barra final). Se usa para el sitemap y
 * robots.txt. Prioridad:
 *   1. VERCEL_PROJECT_PRODUCTION_URL — la inyecta Vercel sola y siempre apunta
 *      al dominio de producción real del proyecto (hoy amoremio-eight.vercel.app,
 *      y el dominio propio si algún día se agrega uno).
 *   2. NEXT_PUBLIC_SITE_URL — override manual para desarrollo local.
 *   3. Fallback hardcodeado al dominio oficial.
 */
export function siteUrl(): string {
  const base =
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://amoremio-eight.vercel.app";
  return base.replace(/\/$/, "");
}

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
