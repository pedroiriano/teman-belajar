import type { MetadataRoute } from "next";

type SitemapPayload = { data?: Array<{ url: string; last_modified: string }> };

// The API is intentionally unavailable while the Portal image is being built.
// Render the sitemap at runtime so the build-time fallback is never frozen into
// the deployed route. The upstream response remains cached for five minutes.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  const publicBase = (process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticEntries: MetadataRoute.Sitemap = ["/", "/news", "/announcements", "/knowledge", "/microlearning", "/help"].map((path) => ({ url: `${publicBase}${path}`, changeFrequency: path === "/" ? "daily" : "weekly", priority: path === "/" ? 1 : 0.8 }));
  if (!apiBase) return staticEntries;
  try {
    const response = await fetch(`${apiBase}/api/v1/discovery/sitemap`, { next: { revalidate: 300 } });
    if (!response.ok) return staticEntries;
    const payload = await response.json() as SitemapPayload;
    return [...staticEntries, ...(payload.data || []).map((item) => ({ url: `${publicBase}${item.url}`, lastModified: new Date(item.last_modified), changeFrequency: "weekly" as const, priority: 0.7 }))];
  } catch { return staticEntries; }
}
