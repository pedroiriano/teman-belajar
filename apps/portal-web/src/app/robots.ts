import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicBase = (process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/dashboard/", "/preview/", "/recovery/", "/search"] }], sitemap: `${publicBase}/sitemap.xml`, host: publicBase };
}
