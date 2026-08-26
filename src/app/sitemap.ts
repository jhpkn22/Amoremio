import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amoremio.vercel.app";
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("id, updated_at")
    .eq("visible_en_vitrina", true)
    .is("deleted_at", null);

  const productos = (data ?? []).map((p: { id: string; updated_at: string }) => ({
    url: `${base}/producto/${p.id}`,
    lastModified: p.updated_at,
  }));

  const ahora = new Date().toISOString();

  return [
    { url: base, lastModified: ahora, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/catalogo`, lastModified: ahora, changeFrequency: "weekly" as const, priority: 0.9 },
    ...productos,
  ];
}
