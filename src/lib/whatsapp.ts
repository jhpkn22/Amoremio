/** Normaliza cualquier formato de teléfono paraguayo a dígitos con código de país (595...), como lo pide wa.me. */
export function normalizarTelefonoPY(numero: string): string {
  const solo = numero.replace(/\D/g, "");
  if (solo.startsWith("595")) return solo;
  if (solo.startsWith("0")) return "595" + solo.slice(1);
  return "595" + solo;
}

export function linkWhatsApp(numero: string, mensaje: string): string {
  return `https://wa.me/${normalizarTelefonoPY(numero)}?text=${encodeURIComponent(mensaje)}`;
}

/** "595985791322" → "0985 791 322", para mostrar en pantalla (no para el link). */
export function formatearTelefonoPY(numero: string): string {
  let solo = normalizarTelefonoPY(numero);
  if (solo.startsWith("595")) solo = "0" + solo.slice(3);
  if (solo.length !== 10) return numero;
  return `${solo.slice(0, 4)} ${solo.slice(4, 7)} ${solo.slice(7)}`;
}
