import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const tablePages = ["news", "announcements", "knowledge", "media"];

for (const page of tablePages) {
  const source = read(`apps/admin-web/src/app/dashboard/${page}/page.tsx`);
  if (!source.includes("AdminDataTable")) failures.push(`${page}: AdminDataTable tidak digunakan`);
  if (!source.includes("AdminPagination")) failures.push(`${page}: AdminPagination tidak digunakan`);
  if (!source.includes("page_size")) failures.push(`${page}: pagination server-side tidak diteruskan`);
}

const faq = read("apps/admin-web/src/app/dashboard/faqs/page.tsx");
if (!faq.includes("AdminClientPagination")) failures.push("FAQ: pagination reusable tidak digunakan");
const taxonomy = read("apps/admin-web/src/app/dashboard/taxonomy/page.tsx");
if (!taxonomy.includes("AdminClientPagination")) failures.push("Taksonomi: pagination reusable tidak digunakan");
for (const page of ["users", "statistics"]) {
  const source = read(`apps/admin-web/src/app/dashboard/${page}/page.tsx`);
  if (!source.includes("AdminDataTable")) failures.push(`${page}: AdminDataTable tidak digunakan`);
}
const component = read("apps/admin-web/src/components/admin-pagination.tsx");
for (const phrase of ["Sebelumnya", "Berikutnya", "Menampilkan", "Data per halaman", "aria-current"]) {
  if (!component.includes(phrase)) failures.push(`AdminPagination: ${phrase} tidak ditemukan`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Kontrak Data Tables dan pagination Admin lulus.");
