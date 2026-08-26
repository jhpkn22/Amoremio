"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagen";
import { urlFotoProducto } from "@/lib/supabase/storage";
import { agregarFoto, eliminarFoto } from "@/app/panel/stock/actions";
import type { ProductoFoto } from "@/lib/types/database";

const BUCKET = "productos";

export function FotosUploader({ productoId, fotosIniciales }: { productoId: string; fotosIniciales: ProductoFoto[] }) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    setError(null);
    const supabase = createClient();

    try {
      for (const archivo of Array.from(archivos)) {
        const id = crypto.randomUUID();
        const [original, thumb] = await Promise.all([
          comprimirImagen(archivo, 1200, 0.85),
          comprimirImagen(archivo, 400, 0.75),
        ]);

        const pathOriginal = `${productoId}/${id}.jpg`;
        const pathThumb = `${productoId}/${id}-thumb.jpg`;

        const [subOriginal, subThumb] = await Promise.all([
          supabase.storage.from(BUCKET).upload(pathOriginal, original, { contentType: "image/jpeg" }),
          supabase.storage.from(BUCKET).upload(pathThumb, thumb, { contentType: "image/jpeg" }),
        ]);

        if (subOriginal.error || subThumb.error) {
          throw new Error(subOriginal.error?.message || subThumb.error?.message || "Error al subir la foto.");
        }

        const resultado = await agregarFoto(productoId, pathOriginal, pathThumb, fotos.length);
        if (!resultado.ok) throw new Error(resultado.error);

        setFotos((prev) => [
          ...prev,
          { id, producto_id: productoId, path_original: pathOriginal, path_thumbnail: pathThumb, orden: prev.length, created_at: new Date().toISOString() },
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo subir la foto: ${e.message}. Si es la primera vez, revisá que exista el bucket "productos" en Supabase Storage.`
          : "No se pudo subir la foto."
      );
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function quitar(foto: ProductoFoto) {
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    await eliminarFoto(foto.id, productoId);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fotos.map((f) => (
          <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFotoProducto(f.path_thumbnail ?? f.path_original)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => quitar(f)}
              aria-label="Quitar foto"
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-ink-600 hover:border-border-strong hover:text-rose-700">
          {subiendo ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-[11px] font-semibold">{subiendo ? "Subiendo…" : "Agregar"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => onArchivos(e.target.files)}
            disabled={subiendo}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-[12.5px] font-medium text-alert">{error}</p>}
    </div>
  );
}
