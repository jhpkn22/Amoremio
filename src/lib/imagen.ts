/**
 * Comprime una imagen en el navegador antes de subirla (punto 3 del
 * brief: "compresión al subir, thumbnails"). Devuelve un blob JPEG
 * redimensionado al ancho máximo indicado.
 */
export function comprimirImagen(archivo: File, anchoMaximo: number, calidad = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, anchoMaximo / img.width);
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo procesar la imagen."));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen."))), "image/jpeg", calidad);
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = url;
  });
}
