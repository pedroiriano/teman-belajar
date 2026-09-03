import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "all";
const failures = [];

function read(path) { return readFileSync(join(root, path), "utf8"); }
function digest(path) { return createHash("sha256").update(readFileSync(join(root, path))).digest("hex"); }
function assert(condition, message) { if (!condition) failures.push(message); }
function contains(path, pattern, message) { assert(pattern.test(read(path)), `${path}: ${message}`); }
function tree(path) { return execFileSync("git", ["rev-parse", `HEAD:${path}`], { cwd: root, encoding: "utf8" }).trim(); }
function files(path) {
  const result = [];
  for (const entry of readdirSync(join(root, path))) {
    const item = join(path, entry);
    if (statSync(join(root, item)).isDirectory()) result.push(...files(item));
    else if (/\.(tsx|ts|css)$/.test(entry)) result.push(item);
  }
  return result;
}

const baselines = {
  "vendor/ui-templates/techwind/ORIGINAL": "1835eb8d9f93e4073b5dc8c1fa8c678fd04c6d61",
  "vendor/ui-templates/cuba/ORIGINAL": "a24b122f055fe744c4b4abfbd60e130f49782078",
};
for (const [path, expected] of Object.entries(baselines)) {
  try { assert(tree(path) === expected, `${path}: vendor ORIGINAL berubah dari baseline immutable`); }
  catch { failures.push(`${path}: baseline vendor tidak dapat diverifikasi`); }
}

const forbiddenDependencies = /"(?:@mui\/|antd|@chakra-ui\/|bootstrap|bulma|semantic-ui)/i;
for (const app of ["apps/portal-web", "apps/admin-web"]) {
  assert(!forbiddenDependencies.test(read(`${app}/package.json`)), `${app}: UI framework paralel tidak diizinkan`);
}

const canonicalBrandAssets = [
  "assets/logo-teman-belajar.png",
  "assets/logo-teman-belajar-favicon-02.png",
  "assets/logo-teman-belajar-favicon-01.png",
  "assets/logo-teman-belajar-app-01.png",
];
assert(existsSync(join(root, "scripts/generate-brand-assets.ps1")), "generator derivatif brand tidak ditemukan");
for (const asset of canonicalBrandAssets) {
  assert(existsSync(join(root, asset)), `${asset}: aset brand canonical tidak ditemukan`);
}
for (const asset of ["logo-main.png", "logo-mark.png", "favicon.png", "app-icon.png"]) {
  const portalAsset = `apps/portal-web/public/brand/${asset}`;
  const adminAsset = `apps/admin-web/public/brand/${asset}`;
  assert(existsSync(join(root, portalAsset)), `${portalAsset}: derivatif brand tidak ditemukan`);
  assert(existsSync(join(root, adminAsset)), `${adminAsset}: derivatif brand tidak ditemukan`);
  if (existsSync(join(root, portalAsset)) && existsSync(join(root, adminAsset))) {
    assert(digest(portalAsset) === digest(adminAsset), `${asset}: derivatif Portal dan Admin tidak sinkron`);
  }
}

if (target === "all" || target === "portal") {
  contains("apps/portal-web/src/app/layout.tsx", /techwind-foundation\.css/, "foundation CSS wajib diimpor");
  contains("apps/portal-web/src/app/layout.tsx", /data-ui-foundation="techwind"/, "runtime marker wajib ada");
  contains("apps/portal-web/src/app/layout.tsx", /Nunito/, "font Techwind Nunito wajib digunakan");
  contains("apps/portal-web/src/components/portal-chrome.tsx", /id="topnav"[\s\S]*id="navigation"[\s\S]*id="back-to-top"/, "shell Techwind wajib lengkap");
  contains("apps/portal-web/src/components/portal-chrome.tsx", /BrandLogo/, "Navbar dan footer wajib memakai logo produk");
  contains("apps/portal-web/src/app/layout.tsx", /\/brand\/favicon\.png[\s\S]*\/brand\/app-icon\.png/, "favicon dan app icon wajib dideklarasikan");
  contains("apps/portal-web/src/components/techwind-runtime.ts", /removeEventListener/, "adapter JS harus melepas event listener React");
  contains("apps/portal-web/src/components/techwind-runtime.ts", /cancelAnimationFrame/, "adapter JS harus membatalkan animation frame React");
  contains("apps/portal-web/src/components/portal-icon.tsx", /data-ui-icon="remix"/, "ikon Portal wajib dipetakan ke Remix");
  contains("apps/portal-web/src/components/techwind/index.tsx", /export function PageHero[\s\S]*export function EmptyState[\s\S]*export function ErrorState[\s\S]*export function ComingSoonState[\s\S]*export function Pagination/, "Portal visual primitives wajib terpusat di Techwind foundation");
  contains("apps/portal-web/src/components/public-content.tsx", /@\/components\/techwind/, "public-content hanya boleh menjadi facade ke Techwind foundation");
  contains("apps/portal-web/src/app/page.tsx", /data-techwind-pattern="index-course-hero"/, "homepage wajib memakai baseline Techwind Online Course");
  contains("apps/portal-web/src/components/techwind/index.tsx", /data-techwind-pattern="course-inner-hero"/, "seluruh inner route wajib memakai hero Online Course bersama");
  contains("apps/portal-web/src/components/learning/course-list.tsx", /portal-course-card[\s\S]*portal-course-progress/, "route pembelajaran wajib memakai pola course card dan progress Techwind");
  contains("apps/portal-web/src/app/globals.css", /\.portal-course-hero/, "hero Online Course Portal wajib ada");
  contains("apps/portal-web/src/app/globals.css", /\.portal-page-hero/, "hero inner-route Portal wajib ada");
  contains("apps/portal-web/src/app/globals.css", /\.portal-learning-hero/, "dashboard pembelajaran Portal wajib ada");
  for (const file of files("apps/portal-web/src")) assert(!/cuba/i.test(read(relative(root, join(root, file)))), `${file}: cross-import/penyebutan Cuba dilarang di Portal`);
}

if (target === "all" || target === "admin") {
  contains("apps/admin-web/src/app/layout.tsx", /cuba-foundation\.css/, "foundation CSS wajib diimpor");
  contains("apps/admin-web/src/app/layout.tsx", /data-ui-foundation="cuba"/, "runtime marker wajib ada");
  contains("apps/admin-web/src/app/layout.tsx", /Rubik/, "font Cuba Rubik wajib digunakan");
  contains("apps/admin-web/src/components/admin-shell.tsx", /id="pageWrapper"[\s\S]*sidebar-wrapper[\s\S]*page-body-wrapper[\s\S]*page-body/, "shell Cuba wajib lengkap");
  contains("apps/admin-web/src/components/admin-shell.tsx", /BrandLogo/, "Sidebar dan footer wajib memakai logo produk");
  contains("apps/admin-web/src/app/layout.tsx", /\/brand\/favicon\.png[\s\S]*\/brand\/app-icon\.png/, "favicon dan app icon wajib dideklarasikan");
  for (const file of ["apps/admin-web/src/components/admin-shell.tsx", "apps/admin-web/src/app/page.tsx"]) {
    assert(!/>\s*TB\s*</.test(read(file)), `${file}: placeholder teks TB dilarang sebagai logo produk`);
  }
  contains("apps/admin-web/src/components/cuba-runtime.ts", /removeEventListener/, "adapter JS harus melepas event listener React");
  contains("apps/admin-web/src/components/cuba-runtime.ts", /cancelAnimationFrame/, "adapter JS harus membatalkan animation frame React");
  contains("apps/admin-web/src/components/admin-icon.tsx", /data-ui-icon="feather"/, "ikon Admin wajib dipetakan ke Feather");
  contains("apps/admin-web/src/components/admin-data-table.tsx", /cuba-data-table[\s\S]*cuba-table/, "data table Cuba wajib digunakan");
  contains("apps/admin-web/src/components/admin-pagination.tsx", /cuba-pagination/, "pagination Cuba wajib digunakan");
  contains("apps/admin-web/src/components/admin-shell.tsx", /data-cuba-template="dashboard-03"/, "seluruh route Admin wajib berada pada baseline Cuba dashboard-03");
  contains("apps/admin-web/src/app/dashboard/page.tsx", /data-cuba-pattern="online-course-dashboard"/, "dashboard Admin wajib memakai pola Cuba Online Course");
  contains("apps/admin-web/src/app/globals.css", /\.cuba-course-banner/, "banner Online Course Admin wajib ada");
  contains("apps/admin-web/src/app/globals.css", /\.admin-page-header/, "page header Cuba bersama wajib ada");
  contains("apps/admin-web/src/app/globals.css", /\.admin-form-card/, "form card Cuba bersama wajib ada");
  contains("apps/admin-web/src/app/globals.css", /\.admin-table-shell/, "table shell Cuba bersama wajib ada");
  for (const file of files("apps/admin-web/src")) assert(!/techwind/i.test(read(relative(root, join(root, file)))), `${file}: cross-import/penyebutan Techwind dilarang di Admin`);
}

for (const app of ["apps/portal-web/src", "apps/admin-web/src"]) {
  for (const file of files(app).filter((path) => path.endsWith(".tsx"))) {
    const source = read(relative(root, join(root, file)));
    assert(!/>[^<{]*(?:Techwind|Cuba|Pixelstrap|Shreethemes)[^<{]*</i.test(source), `${file}: branding vendor tidak boleh terlihat pada UI produk`);
  }
}

if (failures.length) {
  console.error(`UI foundation contract gagal (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`UI foundation contract lulus untuk ${target}.`);
