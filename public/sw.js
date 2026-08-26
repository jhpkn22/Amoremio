// Service worker mínimo — dos objetivos, ninguno es "offline completo":
// 1) cumplir el criterio de instalabilidad PWA del navegador (manifest.ts
//    + un SW registrado con manejador de fetch).
// 2) cache-first para los assets estáticos de Next y network-first con
//    respaldo de última copia conocida para la navegación, así la pestaña
//    ya abierta de Caja no queda en blanco si se corta la señal.
//
// La resiliencia real de ventas offline NO vive acá — vive en IndexedDB
// (ver src/lib/caja/db.ts) y funciona aunque este service worker ni
// siquiera esté instalado.

const CACHE_ESTATICO = "amoremio-estatico-v1";
const CACHE_PAGINAS = "amoremio-paginas-v1";
const ARCHIVOS_PRECARGA = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(ARCHIVOS_PRECARGA))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_ESTATICO && k !== CACHE_PAGINAS).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.open(CACHE_ESTATICO).then(async (cache) => {
        const enCache = await cache.match(request);
        if (enCache) return enCache;
        try {
          const respuesta = await fetch(request);
          if (respuesta.ok) cache.put(request, respuesta.clone());
          return respuesta;
        } catch (e) {
          if (enCache) return enCache;
          throw e;
        }
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          caches.open(CACHE_PAGINAS).then((cache) => cache.put(request, respuesta.clone()));
          return respuesta;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_PAGINAS);
          const enCache = await cache.match(request);
          return enCache || cache.match("/panel/caja");
        })
    );
  }
});
