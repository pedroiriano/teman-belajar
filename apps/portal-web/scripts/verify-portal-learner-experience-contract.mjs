import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

console.log("Menjalankan verifikasi kontrak Portal Learner Experience (Fase 2.5)...");

function assertFile(relPath, requiredTokens = []) {
  const fullPath = path.join(appRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File hilang: ${relPath}`);
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      throw new Error(`Token "${token}" tidak ditemukan pada ${relPath}`);
    }
  }
  return content;
}

// 1. Unified Catalog (/catalog)
assertFile("src/app/catalog/page.tsx", [
  "Katalog Pembelajaran Terpadu",
  "listTrainingPrograms",
  "listMicrolearning",
  "listWebinars",
  "listLearningPaths",
  "formatOptions",
  "PageHero",
  "EmptyState",
]);

// 2. Learner Profile (/profile)
assertFile("src/app/profile/page.tsx", [
  "Profil Peserta Pembelajaran",
  "getServerSession",
  "authOptions",
  "Total Kursus",
  "Sedang Berjalan",
  "Telah Selesai",
  "Kursus Sedang Berjalan",
  "Riwayat & Kelulusan",
  "Informasi Akun",
]);

// 3. Homepage updates
assertFile("src/app/page.tsx", [
  "Buka Katalog Terpadu",
  "/catalog",
]);

// 4. Header & Navigation updates
assertFile("src/components/portal-chrome.tsx", [
  "/catalog",
  "Katalog Pembelajaran",
  "/profile",
]);

// 5. Vendor foundation guard: No cross-import or mention of 'cuba' in portal-web
for (const relPath of ["src/app/catalog/page.tsx", "src/app/profile/page.tsx"]) {
  const content = fs.readFileSync(path.join(appRoot, relPath), "utf-8");
  if (/cuba/i.test(content)) {
    throw new Error(`Cross-mention atau import 'cuba' terdeteksi pada ${relPath}`);
  }
}

console.log("verify-portal-learner-experience-contract: PASS (all checks passed)");
