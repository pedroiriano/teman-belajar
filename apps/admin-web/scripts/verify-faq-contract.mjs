import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/app/dashboard/faqs/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../src/app/actions/faq.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/admin-shell.tsx", import.meta.url), "utf8");
const drafts = readFileSync(new URL("../../../services/portal-api/internal/domain/draft/registry.go", import.meta.url), "utf8");

for (const token of ["useAutoSaveDraft", "MediaPicker", "meta_description", "indexable", "in_review", "approved", "published", "aria-"]) {
  if (!page.includes(token)) throw new Error(`FAQ Admin contract missing ${token}`);
}
for (const token of ["/api/v1/admin/faqs/categories", "/api/v1/admin/faqs/items", "/transition", "attachMediaUsages", "detachMediaUsage"]) {
  if (!actions.includes(token)) throw new Error(`FAQ action contract missing ${token}`);
}
if (!shell.includes('href: "/dashboard/faqs"') || shell.includes('label: "FAQ & Taksonomi", href: "#", icon: "help", disabled: true')) {
  throw new Error("FAQ Admin navigation is still a placeholder");
}
for (const key of ['"faq.create"', '"faq.edit"', 'entityType: "faq_item"']) {
  if (!drafts.includes(key)) throw new Error(`FAQ Auto-Save registry missing ${key}`);
}

console.log("FAQ Admin static contract verified");
