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
for (const expected of ["Kategori dan tampilan publik", "Tampilan di hasil pencarian", "Tampilan saat dibagikan", "Pemeriksaan sebelum terbit", "admin-disclosure", "admin-tag-option"]) {
  if (!component.includes(expected)) throw new Error(`compact discovery UX missing ${expected}`);
}
for (const expected of ["/api/v1/admin/taxonomy/", "/api/v1/admin/discoverability/", "indexable: value.indexable === \"true\""]) {
  if (!actions.includes(expected)) throw new Error(`SEO action contract missing ${expected}`);
}
consumers.forEach((source, index) => {
  if (!source.includes("SeoDiscoverySection")) throw new Error(`consumer ${index + 1} does not reuse SeoDiscoverySection`);
  if (!source.includes("useAutoSaveDraft")) throw new Error(`consumer ${index + 1} lost canonical auto-save`);
});
for (const index of [0, 1, 2, 3]) {
  if (!consumers[index].includes("SeoDiscoverySection compact")) throw new Error(`News/Announcement consumer ${index + 1} did not adopt compact discovery UX`);
}
for (const index of [0, 2]) {
  const discovery = consumers[index].indexOf("SeoDiscoverySection compact embedded");
  const footer = consumers[index].indexOf("admin-form-footer", discovery);
  if (discovery < 0 || footer < discovery) throw new Error(`create consumer ${index + 1} must place discovery settings before the single save footer`);
}
for (const index of [4, 5]) {
  if (consumers[index].includes("SeoDiscoverySection compact")) throw new Error(`Knowledge consumer ${index + 1} changed outside the requested UX scope`);
}
console.log("Admin SEO & Discovery contract: PASS");
