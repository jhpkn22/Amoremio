/** Gs. 85.000 — sin decimales, punto como separador de miles (brief, punto 1). */
export function formatGs(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return "Gs. " + Math.round(valor).toLocaleString("es-PY");
}

export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
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
