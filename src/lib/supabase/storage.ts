const BUCKET_PRODUCTOS = "productos";

/**
 * URL pública de un archivo del bucket "productos" — el bucket se crea
 * público (ver README, paso 2), así que no hace falta cliente ni sesión
 * para armar la URL, es una concatenación directa contra el proyecto.
 */
export function urlFotoProducto(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PRODUCTOS}/${path}`;
}
