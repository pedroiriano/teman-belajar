import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

console.log("Menjalankan verifikasi kontrak Content Versioning & Riwayat Perubahan...");

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

// 1. Types definition
assertFile("src/types/content-versioning.ts", [
  "export interface ContentRevision",
  "export interface DiffLine",
  "export interface DiffResult",
  "export interface RevisionTimelineItem",
  "export interface RollbackResult",
]);

// 2. Diff engine
assertFile("src/lib/diff/diff-engine.ts", [
  "export function computeLineDiff",
  "export function buildSideBySideRows",
  "added",
  "removed",
  "unchanged",
]);

// 3. Server Actions
assertFile("src/app/actions/content-versioning.ts", [
  "export async function getContentRevisionsAction",
  "export async function getRevisionDiffAction",
  "export async function rollbackRevisionAction",
  "broadcastEditorialUpdate",
  "revalidatePath",
]);

// 4. Components
assertFile("src/components/versioning/cuba-diff-viewer.tsx", [
  "CubaDiffViewer",
  "Berdampingan",
  "Tunggal Terpadu",
  "sideBySideRows",
]);

assertFile("src/components/versioning/cuba-revision-timeline.tsx", [
  "CubaRevisionTimeline",
  "Pilih Versi untuk Dibandingkan",
  "onRollback",
]);

assertFile("src/components/versioning/cuba-content-versioning-panel.tsx", [
  "CubaContentVersioningPanel",
  "getContentRevisionsAction",
  "getRevisionDiffAction",
  "rollbackRevisionAction",
  "Konfirmasi Pemulihan Versi",
]);

// 5. Page Integrations
assertFile("src/app/dashboard/knowledge/[id]/page.tsx", [
  "CubaContentVersioningPanel",
  "Riwayat Revisi & Diff",
  "versioning",
]);

assertFile("src/app/dashboard/news/[id]/page.tsx", [
  "CubaContentVersioningPanel",
  "Riwayat Revisi & Diff",
  "versioning",
]);

assertFile("src/app/dashboard/announcements/[id]/page.tsx", [
  "CubaContentVersioningPanel",
  "Riwayat Revisi & Diff",
  "versioning",
]);

// 6. No-Orange Rule check on all versioning files
const versioningFiles = [
  "src/types/content-versioning.ts",
  "src/lib/diff/diff-engine.ts",
  "src/app/actions/content-versioning.ts",
  "src/components/versioning/cuba-diff-viewer.tsx",
  "src/components/versioning/cuba-revision-timeline.tsx",
  "src/components/versioning/cuba-content-versioning-panel.tsx",
];

const forbiddenColors = [/orange/i, /amber/i, /#f59e0b/i, /#f97316/i];
for (const relPath of versioningFiles) {
  const fullPath = path.join(appRoot, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  for (const pattern of forbiddenColors) {
    if (pattern.test(content)) {
      throw new Error(`Pelanggaran No-Orange Rule (${pattern}) pada ${relPath}`);
    }
  }
}

console.log("verify-content-versioning-contract: PASS (all checks passed)");
