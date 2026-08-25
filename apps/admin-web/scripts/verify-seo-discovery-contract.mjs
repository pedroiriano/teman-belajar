import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const component = read("src/components/seo/SeoDiscoverySection.tsx");
const actions = read("src/app/actions/discoverability.ts");
const consumers = [
  "src/app/dashboard/news/create/page.tsx", "src/app/dashboard/news/[id]/page.tsx",
  "src/app/dashboard/announcements/create/page.tsx", "src/app/dashboard/announcements/[id]/page.tsx",
  "src/app/dashboard/knowledge/create/page.tsx", "src/app/dashboard/knowledge/[id]/page.tsx",
].map(read);

for (const expected of ["SEO &amp; Discovery", "Search preview", "Pratinjau sosial", "SEO Health Assistant", "MediaPicker imageOnly", "canonical_path", "tag_ids", "category_id", "indexable", "social_image_alt", "internal_links"]) {
  if (!component.includes(expected)) throw new Error(`SEO component missing ${expected}`);
}
for (const expected of ["/api/v1/admin/taxonomy/", "/api/v1/admin/discoverability/", "indexable: value.indexable === \"true\""]) {
  if (!actions.includes(expected)) throw new Error(`SEO action contract missing ${expected}`);
}
consumers.forEach((source, index) => {
  if (!source.includes("SeoDiscoverySection")) throw new Error(`consumer ${index + 1} does not reuse SeoDiscoverySection`);
  if (!source.includes("useAutoSaveDraft")) throw new Error(`consumer ${index + 1} lost canonical auto-save`);
});
console.log("Admin SEO & Discovery contract: PASS");
