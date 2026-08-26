import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amore Mío — Panel de gestión",
    short_name: "Amore Mío",
    description: "Stock, caja y cuentas corrientes de Amore Mío, Regalos Personalizados.",
    start_url: "/panel/caja",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffaf8",
    theme_color: "#fb6f92",
    lang: "es-PY",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
