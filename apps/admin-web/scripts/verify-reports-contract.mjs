import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const workspace = read("src/components/reports/cuba-reports-workspace.tsx");
const page = read("src/app/dashboard/reports/page.tsx");
const bff = read("src/app/api/bff/reports/route.ts");
const nav = read("src/lib/navigation.ts");

// 1. CubaReportsWorkspace Verification
for (const token of [
  "CubaReportsWorkspace",
  "Pusat Pelaporan",
  "Unduh Excel (.xlsx)",
  "Unduh CSV",
  "Cetak / PDF",
  "learners",
  "courses",
  "certificates",
  "content",
  "audit",
  "handleExportCSV",
  "handleExportExcel",
  "handlePrint",
  "\\uFEFF",
  "urn:schemas-microsoft-com:office:spreadsheet",
  "window.print",
  "Pratinjau Data Laporan",
  "flex-wrap",
  "justify-center",
]) {
  assert.ok(workspace.includes(token), `cuba-reports-workspace.tsx missing token: ${token}`);
}

// 2. Reports Page Verification
for (const token of [
  "ReportsPage",
  "Pusat Pelaporan & Ekspor Data",
  "getServerSession",
  "getServerAccessToken",
  "CubaReportsWorkspace",
]) {
  assert.ok(page.includes(token), `reports/page.tsx missing token: ${token}`);
}

// 3. BFF Endpoint Verification
for (const token of [
  "ExecutiveReportData",
  "LearnerReportItem",
  "CourseReportItem",
  "CertificateReportItem",
  "ContentReportItem",
  "AuditReportItem",
  "/api/v1/admin/analytics/statistics",
  "/api/v1/learning/courses",
  "GET",
]) {
  assert.ok(bff.includes(token), `bff/reports/route.ts missing token: ${token}`);
}

// 4. Navigation Verification
assert.ok(nav.includes('id: "reports"'), "navigation.ts missing reports navigation item");
assert.ok(nav.includes('href: "/dashboard/reports"'), "navigation.ts missing reports href");
assert.ok(nav.includes('reports: "Pusat Pelaporan"'), "navigation.ts missing reports segment title");

// 5. No Orange / Amber Check on Workspace
assert.ok(!workspace.includes("text-orange"), "cuba-reports-workspace.tsx must not contain text-orange");
assert.ok(!workspace.includes("bg-orange"), "cuba-reports-workspace.tsx must not contain bg-orange");
assert.ok(!workspace.includes("border-orange"), "cuba-reports-workspace.tsx must not contain border-orange");
assert.ok(!workspace.includes("text-amber"), "cuba-reports-workspace.tsx must not contain text-amber");
assert.ok(!workspace.includes("bg-amber"), "cuba-reports-workspace.tsx must not contain bg-amber");
assert.ok(!workspace.includes("border-amber"), "cuba-reports-workspace.tsx must not contain border-amber");

console.log("verify-reports-contract.mjs PASS: Executive Reporting & Export Center verified successfully.");
