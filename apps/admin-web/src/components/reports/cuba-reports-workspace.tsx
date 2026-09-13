"use client";

import { useState, useMemo } from "react";
import { AdminIcon } from "@/components/admin-icon";
import type {
  ExecutiveReportData,
  LearnerReportItem,
  CourseReportItem,
  CertificateReportItem,
  ContentReportItem,
  AuditReportItem,
} from "@/app/api/bff/reports/route";

type ReportModule = "learners" | "courses" | "certificates" | "content" | "audit";

interface CubaReportsWorkspaceProps {
  initialData: ExecutiveReportData;
}

export function CubaReportsWorkspace({ initialData }: CubaReportsWorkspaceProps) {
  const [data] = useState<ExecutiveReportData>(initialData);
  const [activeModule, setActiveModule] = useState<ReportModule>("learners");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered Learners
  const filteredLearners = useMemo(() => {
    return data.learners.filter((item) => {
      const matchQuery =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && item.status === "Lulus") ||
        (statusFilter === "in_progress" && item.status === "Sedang Belajar");

      return matchQuery && matchStatus;
    });
  }, [data.learners, searchQuery, statusFilter]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return data.courses.filter((item) => {
      const matchQuery =
        item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "high_completion" && item.completionRate >= 70) ||
        (statusFilter === "visible" && item.visible);

      return matchQuery && matchStatus;
    });
  }, [data.courses, searchQuery, statusFilter]);

  // Filtered Certificates
  const filteredCertificates = useMemo(() => {
    return data.certificates.filter((item) => {
      const matchQuery =
        item.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" && item.status === "Terverifikasi");

      return matchQuery && matchStatus;
    });
  }, [data.certificates, searchQuery, statusFilter]);

  // Filtered Content
  const filteredContent = useMemo(() => {
    return data.content.filter((item) => {
      const matchQuery =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && item.status === "Terbit") ||
        (statusFilter === "draft" && item.status === "Draf");

      return matchQuery && matchStatus;
    });
  }, [data.content, searchQuery, statusFilter]);

  // Filtered Audit
  const filteredAudit = useMemo(() => {
    return data.audit.filter((item) => {
      const matchQuery =
        item.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.details.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "success" && item.status === "Berhasil") ||
        (statusFilter === "failed" && item.status === "Gagal");

      return matchQuery && matchStatus;
    });
  }, [data.audit, searchQuery, statusFilter]);

  // Current active items count
  const currentTotal = useMemo(() => {
    switch (activeModule) {
      case "learners":
        return filteredLearners.length;
      case "courses":
        return filteredCourses.length;
      case "certificates":
        return filteredCertificates.length;
      case "content":
        return filteredContent.length;
      case "audit":
        return filteredAudit.length;
      default:
        return 0;
    }
  }, [activeModule, filteredLearners, filteredCourses, filteredCertificates, filteredContent, filteredAudit]);

  const totalPages = Math.max(1, Math.ceil(currentTotal / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  // Dynamic KPI Stats based on active module
  const kpiStats = useMemo(() => {
    switch (activeModule) {
      case "learners": {
        const total = data.learners.length;
        const lulus = data.learners.filter((l) => l.status === "Lulus").length;
        const aktif = data.learners.filter((l) => l.status === "Sedang Belajar").length;
        const avgProgress =
          total > 0 ? Math.round(data.learners.reduce((s, l) => s + l.progress, 0) / total) : 0;
        return [
          { label: "Total Pembelajar", value: total.toLocaleString("id-ID"), icon: "users", sub: "Terdaftar dalam sistem" },
          { label: "Kelulusan Tuntas", value: lulus.toLocaleString("id-ID"), icon: "check", sub: `${total > 0 ? Math.round((lulus / total) * 100) : 0}% rasio kelulusan` },
          { label: "Sedang Belajar", value: aktif.toLocaleString("id-ID"), icon: "clock", sub: "Memiliki kursus aktif" },
          { label: "Rata-rata Capaian", value: `${avgProgress}%`, icon: "grid", sub: "Progres silabus rata-rata" },
        ];
      }
      case "courses": {
        const total = data.courses.length;
        const totalEnrolled = data.courses.reduce((s, c) => s + c.totalEnrolled, 0);
        const avgCompletion =
          total > 0 ? Math.round(data.courses.reduce((s, c) => s + c.completionRate, 0) / total) : 0;
        return [
          { label: "Total Kursus Aktif", value: total.toLocaleString("id-ID"), icon: "book", sub: "Katalog Moodle terdaftar" },
          { label: "Total Pendaftaran", value: totalEnrolled.toLocaleString("id-ID"), icon: "users", sub: "Akumulasi pembelajar" },
          { label: "Rata-rata Rasio Kelulusan", value: `${avgCompletion}%`, icon: "check", sub: "Tingkat tuntas materi" },
          { label: "Status Visibilitas", value: `${total} Tayang`, icon: "eye", sub: "Tersedia bagi pembelajar" },
        ];
      }
      case "certificates": {
        const total = data.certificates.length;
        return [
          { label: "Total Sertifikat Terbit", value: total.toLocaleString("id-ID"), icon: "check", sub: "Resmi mod_customcert" },
          { label: "Status Kredensial", value: "100% Sah", icon: "audit", sub: "Terverifikasi unik di Moodle" },
          { label: "Format Dokumen", value: "PDF Asli", icon: "file", sub: "Dapat diunduh pembelajar" },
          { label: "Verifikasi Terbuka", value: "QR Ready", icon: "grid", sub: "Validasi keaslian publik" },
        ];
      }
      case "content": {
        const total = data.content.length;
        const terbit = data.content.filter((c) => c.status === "Terbit").length;
        const totalTayangan = data.content.reduce((s, c) => s + c.views, 0);
        return [
          { label: "Total Item Konten", value: total.toLocaleString("id-ID"), icon: "file", sub: "Pengetahuan, berita, dll." },
          { label: "Konten Terbit", value: terbit.toLocaleString("id-ID"), icon: "check", sub: `${total > 0 ? Math.round((terbit / total) * 100) : 0}% siap dibaca publik` },
          { label: "Total Pembaca / Tayangan", value: totalTayangan.toLocaleString("id-ID"), icon: "eye", sub: "Aktivitas pembaca portal" },
          { label: "Kategori Kurasi", value: "Lengkap", icon: "folder", sub: "Berita, FAQ, Pengetahuan" },
        ];
      }
      case "audit": {
        const total = data.audit.length;
        const success = data.audit.filter((a) => a.status === "Berhasil").length;
        return [
          { label: "Total Catatan Audit", value: total.toLocaleString("id-ID"), icon: "audit", sub: "Riwayat aktivitas platform" },
          { label: "Operasi Sukses", value: `${success}`, icon: "check", sub: `${total > 0 ? Math.round((success / total) * 100) : 100}% tanpa kegagalan` },
          { label: "Integritas Data", value: "Terekam", icon: "health", sub: "Sesuai standar IT Governance" },
          { label: "Privasi Alamat IP", value: "Dilindungi", icon: "settings", sub: "Anonimisasi kepatuhan audit" },
        ];
      }
    }
  }, [activeModule, data]);

  // Export CSV Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const lines: string[] = [];

      lines.push(`LAPORAN EKSEKUTIF RESMI PLATFORM TEMAN BELAJAR`);
      lines.push(`Modul,${activeModule.toUpperCase()}`);
      lines.push(`Tanggal Dibuat,${dateStr} ${now.toLocaleTimeString("id-ID")}`);
      lines.push(`Rentang Waktu,${timeRange === "all" ? "Semua Waktu" : timeRange}`);
      lines.push("");

      if (activeModule === "learners") {
        lines.push("No,Nama Lengkap,Username,Email,Kursus Pelatihan,Progres (%),Status,Tanggal Terdaftar,Tanggal Selesai");
        filteredLearners.forEach((item, idx) => {
          lines.push(
            `${idx + 1},"${item.name.replaceAll('"', '""')}","${item.username}","${item.email}","${item.courseName.replaceAll('"', '""')}",${item.progress}%,"${item.status}","${item.enrolledAt}","${item.completedAt || "-"}"`
          );
        });
      } else if (activeModule === "courses") {
        lines.push("No,ID Kursus,Nama Singkat,Nama Lengkap Kursus,Kategori,Total Peserta,Lulusan,Rasio Kelulusan (%),Visibilitas");
        filteredCourses.forEach((item, idx) => {
          lines.push(
            `${idx + 1},${item.id},"${item.shortName}","${item.fullName.replaceAll('"', '""')}","${item.category}",${item.totalEnrolled},${item.totalCompleted},${item.completionRate}%,"${item.visible ? "Tayang" : "Tersembunyi"}"`
          );
        });
      } else if (activeModule === "certificates") {
        lines.push("No,ID Sertifikat,Nama Penerima,Email,Nama Kursus,Judul Sertifikat,Kode Verifikasi Moodle,Tanggal Terbit,Status");
        filteredCertificates.forEach((item, idx) => {
          lines.push(
            `${idx + 1},"${item.id}","${item.recipientName.replaceAll('"', '""')}","${item.recipientEmail}","${item.courseName.replaceAll('"', '""')}","${item.certificateTitle}","${item.code}","${item.issuedAt}","${item.status}"`
          );
        });
      } else if (activeModule === "content") {
        lines.push("No,Tipe Konten,Judul Konten,Penulis,Kategori,Status,Total Tayangan,Tanggal Terbit");
        filteredContent.forEach((item, idx) => {
          lines.push(
            `${idx + 1},"${item.type}","${item.title.replaceAll('"', '""')}","${item.author}","${item.category}","${item.status}",${item.views},"${item.publishedAt}"`
          );
        });
      } else if (activeModule === "audit") {
        lines.push("No,Waktu Peristiwa,Aktor Pengguna,Aksi / Event,Modul Sistem,Status,Alamat IP,Keterangan Rincian");
        filteredAudit.forEach((item, idx) => {
          lines.push(
            `${idx + 1},"${item.timestamp}","${item.actor}","${item.action}","${item.module}","${item.status}","${item.ipAddress}","${item.details.replaceAll('"', '""')}"`
          );
        });
      }

      // Prepend UTF-8 BOM so Excel opens indonesian characters cleanly without garbled text
      const csvContent = "\uFEFF" + lines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `laporan-${activeModule}-teman-belajar-${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Excel (.xls XML format) Handler
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];

      let headers: string[] = [];
      let rows: string[][] = [];

      if (activeModule === "learners") {
        headers = ["No", "Nama Lengkap", "Username", "Email", "Kursus", "Progres", "Status", "Tgl Daftar", "Tgl Selesai"];
        rows = filteredLearners.map((item, idx) => [
          String(idx + 1),
          item.name,
          item.username,
          item.email,
          item.courseName,
          `${item.progress}%`,
          item.status,
          item.enrolledAt,
          item.completedAt || "-",
        ]);
      } else if (activeModule === "courses") {
        headers = ["No", "ID", "Kode", "Nama Lengkap Kursus", "Kategori", "Peserta", "Lulusan", "Kelulusan", "Status"];
        rows = filteredCourses.map((item, idx) => [
          String(idx + 1),
          String(item.id),
          item.shortName,
          item.fullName,
          item.category,
          String(item.totalEnrolled),
          String(item.totalCompleted),
          `${item.completionRate}%`,
          item.visible ? "Tayang" : "Tersembunyi",
        ]);
      } else if (activeModule === "certificates") {
        headers = ["No", "ID Sertifikat", "Nama Penerima", "Email", "Nama Kursus", "Judul", "Kode Verifikasi", "Tgl Terbit", "Status"];
        rows = filteredCertificates.map((item, idx) => [
          String(idx + 1),
          item.id,
          item.recipientName,
          item.recipientEmail,
          item.courseName,
          item.certificateTitle,
          item.code,
          item.issuedAt,
          item.status,
        ]);
      } else if (activeModule === "content") {
        headers = ["No", "Tipe", "Judul Konten", "Penulis", "Kategori", "Status", "Tayangan", "Tgl Terbit"];
        rows = filteredContent.map((item, idx) => [
          String(idx + 1),
          item.type,
          item.title,
          item.author,
          item.category,
          item.status,
          String(item.views),
          item.publishedAt,
        ]);
      } else if (activeModule === "audit") {
        headers = ["No", "Waktu", "Aktor", "Aksi / Event", "Modul", "Status", "IP", "Keterangan"];
        rows = filteredAudit.map((item, idx) => [
          String(idx + 1),
          item.timestamp,
          item.actor,
          item.action,
          item.module,
          item.status,
          item.ipAddress,
          item.details,
        ]);
      }

      // Build valid XML Spreadsheet
      const xmlHeader = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0369A1" ss:Bold="1"/>
   <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BAE6FD"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Laporan ${activeModule}">
  <Table>`;

      const xmlRows: string[] = [];
      // Header row
      xmlRows.push("   <Row ss:Height=\"24\" ss:StyleID=\"Header\">");
      headers.forEach((h) => {
        xmlRows.push(`    <Cell><Data ss:Type="String">${h}</Data></Cell>`);
      });
      xmlRows.push("   </Row>");

      // Data rows
      rows.forEach((r) => {
        xmlRows.push("   <Row ss:Height=\"20\">");
        r.forEach((cellVal) => {
          const escaped = cellVal
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
          xmlRows.push(`    <Cell><Data ss:Type="String">${escaped}</Data></Cell>`);
        });
        xmlRows.push("   </Row>");
      });

      const xmlFooter = `  </Table>
 </Worksheet>
</Workbook>`;

      const fullXml = xmlHeader + "\n" + xmlRows.join("\n") + "\n" + xmlFooter;
      const blob = new Blob([fullXml], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `laporan-${activeModule}-teman-belajar-${dateStr}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Slice paginated items
  const paginatedLearners = filteredLearners.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedCertificates = filteredCertificates.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedContent = filteredContent.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedAudit = filteredAudit.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="cuba-badge cuba-badge-primary">Pusat Pelaporan</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Sinkronisasi: {new Date(data.generatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Pusat Pelaporan & Ekspor Data
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rekapitulasi komprehensif kompetensi pembelajar, pelatihan Moodle, publikasi konten, dan sertifikat resmi.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="cuba-action-btn admin-button inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm transition"
            title="Unduh format spreadsheet Excel dengan formatting sel rapi"
          >
            <AdminIcon name="download" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? "Menyiapkan..." : "Unduh Excel (.xlsx)"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="cuba-action-btn admin-button inline-flex items-center gap-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 shadow-sm transition"
            title="Unduh format CSV universal berpenanda UTF-8 BOM"
          >
            <AdminIcon name="file" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="cuba-action-btn admin-button cuba-btn-primary inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 shadow-sm transition"
            title="Buka dialog cetak atau ekspor PDF"
          >
            <AdminIcon name="audit" className="h-4 w-4 text-white" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        {kpiStats.map((stat, i) => (
          <div key={i} className="admin-card p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {stat.label}
              </span>
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/60 p-2 text-sky-600 dark:text-sky-400">
                <AdminIcon name={stat.icon as any} className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* 3. Module Selector Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 print:hidden">
        <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Modul Laporan">
          {[
            { id: "learners", label: "Rekap Pembelajar", icon: "users", count: data.learners.length },
            { id: "courses", label: "Partisipasi Kursus Moodle", icon: "book", count: data.courses.length },
            { id: "certificates", label: "Sertifikat Kelulusan", icon: "check", count: data.certificates.length },
            { id: "content", label: "Katalog Konten Editorial", icon: "file", count: data.content.length },
            { id: "audit", label: "Jejak Audit & Keamanan", icon: "audit", count: data.audit.length },
          ].map((tab) => {
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveModule(tab.id as ReportModule);
                  setCurrentPage(1);
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                  isActive
                    ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <AdminIcon name={tab.icon as any} className="h-4 w-4" />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="admin-card p-4 border border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <AdminIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Cari dalam data ${activeModule}...`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">Semua Status</option>
                {activeModule === "learners" && (
                  <>
                    <option value="completed">Lulus (100%)</option>
                    <option value="in_progress">Sedang Belajar</option>
                  </>
                )}
                {activeModule === "courses" && (
                  <>
                    <option value="high_completion">Kelulusan Tinggi (&ge;70%)</option>
                    <option value="visible">Tayang di Katalog</option>
                  </>
                )}
                {activeModule === "certificates" && (
                  <option value="verified">Terverifikasi Sah</option>
                )}
                {activeModule === "content" && (
                  <>
                    <option value="published">Terbit Resmi</option>
                    <option value="draft">Draf Redaksi</option>
                  </>
                )}
                {activeModule === "audit" && (
                  <>
                    <option value="success">Berhasil</option>
                    <option value="failed">Gagal / Ditolak</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rentang:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">Semua Waktu</option>
                <option value="7_days">7 Hari Terakhir</option>
                <option value="30_days">30 Hari Terakhir</option>
                <option value="90_days">90 Hari Terakhir</option>
                <option value="1_year">1 Tahun Terakhir</option>
              </select>
            </div>

            {(searchQuery || statusFilter !== "all" || timeRange !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTimeRange("all");
                  setCurrentPage(1);
                }}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline px-2 py-1"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Live Data Preview Table */}
      <div className="admin-card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pratinjau Data Laporan ({currentTotal} Baris Ditemukan)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Data yang tampil di bawah ini adalah data yang akan disertakan dalam file unduhan ekspor.
            </p>
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Halaman {safePage} dari {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Module 1: Learners Table */}
          {activeModule === "learners" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Nama Pembelajar</th>
                  <th className="px-6 py-3.5">Email & Akun</th>
                  <th className="px-6 py-3.5">Kursus Terdaftar</th>
                  <th className="px-6 py-3.5">Progres</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Tgl Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedLearners.length > 0 ? (
                  paginatedLearners.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        <div>{row.email}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">@{row.username}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.courseName}>
                        {row.courseName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full ${row.progress === 100 ? "bg-emerald-500" : "bg-sky-500"}`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{row.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status === "Lulus"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {row.completedAt || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada data pembelajar yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Module 2: Courses Table */}
          {activeModule === "courses" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">ID / Kode</th>
                  <th className="px-6 py-3.5">Nama Lengkap Kursus</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5 text-center">Peserta</th>
                  <th className="px-6 py-3.5 text-center">Kelulusan</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCourses.length > 0 ? (
                  paginatedCourses.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {row.shortName}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.fullName}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.category}</td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {row.totalEnrolled} orang
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {row.completionRate}%
                        </span>{" "}
                        ({row.totalCompleted} lulus)
                      </td>
                      <td className="px-6 py-4">
                        <span className="cuba-badge cuba-badge-success">Aktif Tayang</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada data kursus yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Module 3: Certificates Table */}
          {activeModule === "certificates" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">ID Sertifikat</th>
                  <th className="px-6 py-3.5">Penerima & Email</th>
                  <th className="px-6 py-3.5">Pelatihan Asal</th>
                  <th className="px-6 py-3.5">Kode Unik Moodle</th>
                  <th className="px-6 py-3.5">Tanggal Terbit</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCertificates.length > 0 ? (
                  paginatedCertificates.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{row.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{row.recipientName}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{row.recipientEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.courseName}>
                        {row.courseName}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {row.code}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.issuedAt}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <AdminIcon name="check" className="h-3 w-3" />
                          <span>{row.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada data sertifikat yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Module 4: Content Table */}
          {activeModule === "content" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Tipe</th>
                  <th className="px-6 py-3.5">Judul Konten</th>
                  <th className="px-6 py-3.5">Penulis / Kurator</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5 text-center">Tayangan</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedContent.length > 0 ? (
                  paginatedContent.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white max-w-sm truncate" title={row.title}>
                        {row.title}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.author}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.category}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {row.views.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status === "Terbit"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada konten yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Module 5: Audit Table */}
          {activeModule === "audit" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Waktu Peristiwa</th>
                  <th className="px-6 py-3.5">Aktor Pengguna</th>
                  <th className="px-6 py-3.5">Aksi / Event</th>
                  <th className="px-6 py-3.5">Modul</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedAudit.length > 0 ? (
                  paginatedAudit.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {row.timestamp}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.actor}</td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {row.action}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.module}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status === "Berhasil"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-sm truncate" title={row.details}>
                        {row.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Tidak ada catatan audit yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 dark:border-slate-800 print:hidden">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, currentTotal)} dari {currentTotal} baris
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Print Footer Stamp */}
      <div className="hidden print:block text-center pt-8 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-bold text-slate-900">Platform Teman Belajar — Dokumen Resmi Laporan Eksekutif</p>
        <p className="mt-1">Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} pukul {new Date().toLocaleTimeString("id-ID")} WIB</p>
      </div>
    </div>
  );
}
