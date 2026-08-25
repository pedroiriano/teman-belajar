import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const news = read("src/app/news/[slug]/page.tsx");
const knowledge = read("src/app/knowledge/[slug]/page.tsx");
const announcement = read("src/app/announcements/[slug]/page.tsx");
const sitemap = read("src/app/sitemap.ts");
const robots = read("src/app/robots.ts");
const proxy = read("src/proxy.ts");
const structured = read("src/components/structured-data.tsx");

for (const [name, source] of [["news", news], ["knowledge", knowledge], ["announcement", announcement]]) {
  for (const expected of ["generateMetadata", "metadataFromSEO", "StructuredData", "BreadcrumbList", "absolutePublicUrl", "redirect: \"manual\"", "permanentRedirect"]) {
    if (!source.includes(expected)) throw new Error(`${name} SSR contract missing ${expected}`);
  }
}
if (!sitemap.includes("/api/v1/discovery/sitemap")) throw new Error("Sitemap API source missing");
if (!sitemap.includes('dynamic = "force-dynamic"')) throw new Error("Sitemap must render at runtime; build-time API fallback may not be frozen");
for (const expected of ["PUBLIC_DETAIL", 'redirect: "manual"', "NextResponse.redirect(destination, 308)", 'destination.search = ""']) {
  if (!proxy.includes(expected)) throw new Error(`Permanent redirect proxy missing ${expected}`);
}
for (const path of ["/api/", "/preview/", "/search"]) if (!robots.includes(path)) throw new Error(`robots missing ${path}`);
for (const escaped of ["\\u003c", "\\u003e", "\\u0026"]) if (!structured.includes(escaped)) throw new Error(`JSON-LD escaping missing ${escaped}`);
console.log("Portal SEO & Discovery SSR contract: PASS");
