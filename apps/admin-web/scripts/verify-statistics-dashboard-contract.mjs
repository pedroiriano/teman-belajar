import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const charts = read("src/components/statistics/cuba-statistics-charts.tsx");
const engagement = read("src/components/statistics/cuba-engagement-metrics.tsx");
const exp = read("src/components/statistics/cuba-statistics-export.tsx");
const page = read("src/app/dashboard/statistics/page.tsx");
const css = read("src/styles/cuba-foundation.css");

// 1. CubaStatisticsCharts Verification
for (const token of [
  "CubaStatisticsCharts",
  "CubaApexChart",
  "Semua Modul",
  "Lalu Lintas Halaman",
  "Konsumsi Konten",
  "Pencarian Platform",
  "Autentikasi SSO",
  "type: \"area\"",
  "type: \"heatmap\"",
  "colorScale",
  "Senin",
  "Minggu",
  "Pagi",
  "Siang",
]) {
  assert.ok(charts.includes(token), `cuba-statistics-charts.tsx missing token: ${token}`);
}

// 2. CubaEngagementMetrics Verification
for (const token of [
  "CubaEngagementMetrics",
  "KEPUASAN PENGGUNA",
  "INTERAKSI SIMPAN",
  "EFEKTIVITAS TEMUAN",
  "RASIO KLIK HASIL (CTR)",
  "KONTEN TERPOPULER",
  "topContent",
  "starCount",
]) {
  assert.ok(engagement.includes(token), `cuba-engagement-metrics.tsx missing token: ${token}`);
}

// 3. CubaStatisticsExport Verification
for (const token of [
  "CubaStatisticsExport",
  "handleExportCSV",
  "handlePrintPDF",
  "\\uFEFF",
  "text/csv",
  "window.print",
  "Unduh CSV",
  "Cetak / Ekspor PDF",
]) {
  assert.ok(exp.includes(token), `cuba-statistics-export.tsx missing token: ${token}`);
}

// 4. Page Integration Verification
for (const token of [
  "CubaStatisticsCharts",
  "CubaEngagementMetrics",
  "CubaStatisticsExport",
  "cuba-print-header",
  "id=\"tren\"",
  "id=\"engagement\"",
]) {
  assert.ok(page.includes(token), `statistics/page.tsx missing token: ${token}`);
}

// 5. CSS Print Foundation Verification
for (const token of [
  "@media print",
  ".cuba-print-header",
  "#admin-sidebar",
  "page-break-inside: avoid",
]) {
  assert.ok(css.includes(token), `cuba-foundation.css missing token: ${token}`);
}

console.log("verify-statistics-dashboard-contract: PASS (all checks passed)");
