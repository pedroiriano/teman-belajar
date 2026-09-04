"use client";

import { useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import type { StatisticsResponse } from "@/types/analytics";

interface CubaStatisticsExportProps {
  data: StatisticsResponse;
  days: string;
}

export function CubaStatisticsExport({ data, days }: CubaStatisticsExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("id-ID");

      const totalPageViews = data.page_views?.reduce((sum, r) => sum + (r.views || 0), 0) || 0;
      const totalSearches = data.search?.reduce((sum, r) => sum + (r.total_searches || 0), 0) || 0;
      const zeroResults = data.search?.reduce((sum, r) => sum + (r.zero_results || 0), 0) || 0;
      const searchClicks = data.search?.reduce((sum, r) => sum + (r.result_clicks || 0), 0) || 0;

      const lines: string[] = [];

      // 1. Metadata
      lines.push("LAPORAN STATISTIK DAN ANALITIK PLATFORM TEMAN BELAJAR");
      lines.push(`Periode Data,${days} Hari Terakhir`);
      lines.push(`Waktu Unduh,${dateStr} ${timeStr}`);
      lines.push("");

      // 2. Ringkasan Eksekutif
      lines.push("=== RINGKASAN EKSEKUTIF ===");
      lines.push("Metrik,Nilai");
      lines.push(`Total Tayangan Halaman,${totalPageViews}`);
      lines.push(`Pengunjung Unik,${data.period_unique_visitors?.value ?? "N/A"}`);
      lines.push(`Total Pencarian,${totalSearches}`);
      lines.push(`Pencarian Hasil Nol,${zeroResults}`);
      lines.push(`Klik Hasil Pencarian,${searchClicks}`);
      lines.push(`Markah Tersimpan,${data.engagement?.bookmarks ?? 0}`);
      lines.push(`Rata-rata Rating,${data.engagement?.avg_rating?.toFixed(2) ?? "N/A"}`);
      lines.push("");

      // 3. Rincian Lalu Lintas Halaman
      lines.push("=== LALU LINTAS HALAMAN ===");
      lines.push("Tanggal,Path Halaman,Tayangan,Pengunjung Unik Harian");
      if (data.page_views && data.page_views.length > 0) {
        data.page_views.forEach((row) => {
          lines.push(`"${row.date}","${row.path.replaceAll('"', '""')}",${row.views},${row.unique_visitors}`);
        });
      } else {
        lines.push("Tidak ada data");
      }
      lines.push("");

      // 4. Konsumsi Konten
      lines.push("=== KONSUMSI KONTEN PUBLIK ===");
      lines.push("Tanggal,Jenis Konten,Target ID,Tayangan,Pengunjung Unik");
      if (data.content && data.content.length > 0) {
        data.content.forEach((row) => {
          lines.push(`"${row.date}","${row.content_type}","${row.target_id.replaceAll('"', '""')}",${row.views},${row.unique_visitors}`);
        });
      } else {
        lines.push("Tidak ada data");
      }
      lines.push("");

      // 5. Metrik Pencarian
      lines.push("=== METRIK PENCARIAN ===");
      lines.push("Tanggal,Total Pencarian,Hasil Kosong,Klik Hasil");
      if (data.search && data.search.length > 0) {
        data.search.forEach((row) => {
          lines.push(`"${row.date}",${row.total_searches},${row.zero_results},${row.result_clicks}`);
        });
      } else {
        lines.push("Tidak ada data");
      }
      lines.push("");

      // 6. Pembelajaran Moodle
      lines.push("=== PEMBELAJARAN (MOODLE) ===");
      lines.push("ID Kursus,Nama Kursus,Total Akses,Pembelajar Unik");
      if (data.learning_period?.top_courses && data.learning_period.top_courses.length > 0) {
        data.learning_period.top_courses.forEach((c) => {
          lines.push(`${c.course_id},"${c.course_name.replaceAll('"', '""')}",${c.accesses},${c.unique_learners}`);
        });
      } else {
        lines.push("Tidak ada data");
      }
      lines.push("");

      // 7. Autentikasi SSO
      lines.push("=== AUTENTIKASI SSO ===");
      lines.push("Tanggal,Login Berhasil,Login Gagal");
      if (data.sso && data.sso.length > 0) {
        data.sso.forEach((row) => {
          lines.push(`"${row.date}",${row.successful_logins},${row.failed_logins}`);
        });
      } else {
        lines.push("Tidak ada data");
      }

      // Prepend UTF-8 BOM so Excel opens indonesian characters properly
      const csvContent = "\uFEFF" + lines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `laporan-statistik-teman-belajar-${days}hari-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={isExporting}
        className="cuba-action-btn admin-button cuba-btn-outline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        title="Unduh rekapitulasi data lengkap dalam format CSV"
      >
        <AdminIcon name="file" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        <span>{isExporting ? "Menyiapkan..." : "Unduh CSV"}</span>
      </button>

      <button
        type="button"
        onClick={handlePrintPDF}
        className="cuba-action-btn admin-button cuba-btn-primary inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
        title="Buka dialog cetak atau simpan dokumen PDF resmi"
      >
        <AdminIcon name="audit" className="h-4 w-4 text-white" />
        <span>Cetak / Ekspor PDF</span>
      </button>
    </div>
  );
}
