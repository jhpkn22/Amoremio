"use client";

import { useEffect, useRef, useState } from "react";

const INTERVALO_MS = 5000;

function mismasFotos(a: string[], b: string[]) {
  return a.length === b.length && a.every((foto, i) => foto === b[i]);
}

export function HeroRotator({ fotos }: { fotos: string[] }) {
  // Mostramos siempre `fotosVisibles`, que solo se actualiza a las fotos nuevas
  // una vez que ya están precargadas en el navegador. Así, al cambiar de
  // categoría, la foto anterior se queda en pantalla hasta que la nueva esté
  // lista — en vez de dejar un hueco gris mientras se descarga.
  const [fotosVisibles, setFotosVisibles] = useState(fotos);
  const [indice, setIndice] = useState(0);
  const anteriorRef = useRef(fotos);

  useEffect(() => {
    if (mismasFotos(fotos, anteriorRef.current)) return;
    anteriorRef.current = fotos;

    if (fotos.length === 0) {
      setFotosVisibles([]);
      setIndice(0);
      return;
    }

    let cancelado = false;
    Promise.all(
      fotos.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          })
      )
    ).then(() => {
      if (cancelado) return;
      setFotosVisibles(fotos);
      setIndice(0);
    });

    return () => {
      cancelado = true;
    };
  }, [fotos]);

  useEffect(() => {
    if (fotosVisibles.length <= 1) return;
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % fotosVisibles.length);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [fotosVisibles.length]);

  if (fotosVisibles.length === 0) return null;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {fotosVisibles.map((foto, i) => (
        <div
          key={foto}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${foto})`,
            opacity: i === indice ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
