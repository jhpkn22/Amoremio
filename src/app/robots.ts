import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amoremio.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/panel" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
