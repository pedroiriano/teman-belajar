"use client";

import { useState, useMemo } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { AdminDataTable, type ColumnHeader } from "@/components/admin-data-table";
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
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

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

  // Sorted items
  const sortedLearners = useMemo(() => {
    if (!sortKey) return filteredLearners;
    return [...filteredLearners].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "id-ID")
        : String(bVal).localeCompare(String(aVal), "id-ID");
    });
  }, [filteredLearners, sortKey, sortDirection]);

  const sortedCourses = useMemo(() => {
    if (!sortKey) return filteredCourses;
    return [...filteredCourses].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "id-ID")
        : String(bVal).localeCompare(String(aVal), "id-ID");
    });
  }, [filteredCourses, sortKey, sortDirection]);

  const sortedCertificates = useMemo(() => {
    if (!sortKey) return filteredCertificates;
    return [...filteredCertificates].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "id-ID")
        : String(bVal).localeCompare(String(aVal), "id-ID");
    });
  }, [filteredCertificates, sortKey, sortDirection]);

  const sortedContent = useMemo(() => {
    if (!sortKey) return filteredContent;
    return [...filteredContent].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "id-ID")
        : String(bVal).localeCompare(String(aVal), "id-ID");
    });
  }, [filteredContent, sortKey, sortDirection]);

  const sortedAudit = useMemo(() => {
    if (!sortKey) return filteredAudit;
    return [...filteredAudit].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? "";
      const bVal = (b as any)[sortKey] ?? "";
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "id-ID")
        : String(bVal).localeCompare(String(aVal), "id-ID");
    });
  }, [filteredAudit, sortKey, sortDirection]);

  // Slice paginated items
  const paginatedLearners = sortedLearners.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedCourses = sortedCourses.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedCertificates = sortedCertificates.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedContent = sortedContent.slice((safePage - 1) * pageSize, safePage * pageSize);
  const paginatedAudit = sortedAudit.slice((safePage - 1) * pageSize, safePage * pageSize);

  const moduleConfig: Record<
    ReportModule,
    {
      title: string;
      description: string;
      headers: (string | ColumnHeader)[];
      statusOptions: { value: string; label: string }[];
      searchPlaceholder: string;
      emptyState: string;
    }
  > = {
    learners: {
      title: "Pratinjau Data Laporan — Rekap Pembelajar & Progres",
      description: "Data capaian silabus, akun pengguna, kursus terdaftar, dan status kelulusan peserta.",
      headers: [
        { key: "name", label: "Nama Pembelajar", sortable: true },
        { key: "email", label: "Email & Akun", sortable: true },
        { key: "courseName", label: "Kursus Terdaftar", sortable: true },
        { key: "progress", label: "Progres", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "completedAt", label: "Tgl Selesai", sortable: true },
      ],
      statusOptions: [
        { value: "all", label: "Semua Status" },
        { value: "completed", label: "Lulus (100%)" },
        { value: "in_progress", label: "Sedang Belajar" },
      ],
      searchPlaceholder: "Cari nama, email, akun, kursus…",
      emptyState: "Tidak ada data pembelajar yang cocok dengan kriteria pencarian atau filter.",
    },
    courses: {
      title: "Pratinjau Data Laporan — Partisipasi Kursus Moodle",
      description: "Katalog kursus aktif, akumulasi peserta terdaftar, dan rasio penyelesaian materi.",
      headers: [
        { key: "shortName", label: "ID / Kode", sortable: true },
        { key: "fullName", label: "Nama Lengkap Kursus", sortable: true },
        { key: "category", label: "Kategori", sortable: true },
        { key: "totalEnrolled", label: "Peserta", align: "center", sortable: true },
        { key: "completionRate", label: "Kelulusan", align: "center", sortable: true },
        { key: "status", label: "Status" },
      ],
      statusOptions: [
        { value: "all", label: "Semua Status" },
        { value: "high_completion", label: "Kelulusan Tinggi (≥70%)" },
        { value: "visible", label: "Tayang di Katalog" },
      ],
      searchPlaceholder: "Cari kode, nama kursus, kategori…",
      emptyState: "Tidak ada data kursus yang cocok dengan kriteria pencarian atau filter.",
    },
    certificates: {
      title: "Pratinjau Data Laporan — Sertifikat Kelulusan Resmi",
      description: "Daftar sertifikat kelulusan mod_customcert resmi dengan kode unik verifikasi Moodle.",
      headers: [
        { key: "id", label: "ID Sertifikat", sortable: true },
        { key: "recipientName", label: "Penerima & Email", sortable: true },
        { key: "courseName", label: "Pelatihan Asal", sortable: true },
        { key: "code", label: "Kode Unik Moodle", sortable: true },
        { key: "issuedAt", label: "Tanggal Terbit", sortable: true },
        { key: "status", label: "Status" },
      ],
      statusOptions: [
        { value: "all", label: "Semua Status" },
        { value: "verified", label: "Terverifikasi Sah" },
      ],
      searchPlaceholder: "Cari nama penerima, email, kode sertifikat, judul pelatihan…",
      emptyState: "Tidak ada data sertifikat yang cocok dengan kriteria pencarian atau filter.",
    },
    content: {
      title: "Pratinjau Data Laporan — Katalog Konten Editorial & Informasi",
      description: "Rekapitulasi artikel pengetahuan, berita, pengumuman, dan FAQ publik.",
      headers: [
        { key: "type", label: "Tipe", sortable: true },
        { key: "title", label: "Judul Konten", sortable: true },
        { key: "author", label: "Penulis / Kurator", sortable: true },
        { key: "category", label: "Kategori", sortable: true },
        { key: "views", label: "Tayangan", align: "center", sortable: true },
        { key: "status", label: "Status" },
      ],
      statusOptions: [
        { value: "all", label: "Semua Status" },
        { value: "published", label: "Terbit Resmi" },
        { value: "draft", label: "Draf Redaksi" },
      ],
      searchPlaceholder: "Cari judul, penulis, kategori, tipe…",
      emptyState: "Tidak ada konten yang cocok dengan kriteria pencarian atau filter.",
    },
    audit: {
      title: "Pratinjau Data Laporan — Jejak Audit & Keamanan Sistem",
      description: "Log aktivitas administratif, integritas data, dan keamanan akses platform.",
      headers: [
        { key: "timestamp", label: "Waktu Peristiwa", sortable: true },
        { key: "actor", label: "Aktor Pengguna", sortable: true },
        { key: "action", label: "Aksi / Event", sortable: true },
        { key: "module", label: "Modul", sortable: true },
        { key: "status", label: "Status" },
        { key: "details", label: "Keterangan" },
      ],
      statusOptions: [
        { value: "all", label: "Semua Status" },
        { value: "success", label: "Berhasil" },
        { value: "failed", label: "Gagal / Ditolak" },
      ],
      searchPlaceholder: "Cari aktor, event, modul, keterangan…",
      emptyState: "Tidak ada catatan audit yang cocok dengan kriteria pencarian atau filter.",
    },
  };

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
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Modul Laporan">
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
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shadow-sm"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <AdminIcon
                  name={tab.icon as any}
                  className={`h-4 w-4 ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`}
                />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? "bg-sky-600 text-white dark:bg-sky-500"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 4. Unified Cuba AdminDataTable Presentation */}
      <AdminDataTable
        title={moduleConfig[activeModule].title}
        description={moduleConfig[activeModule].description}
        itemCount={currentTotal}
        headers={moduleConfig[activeModule].headers}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={moduleConfig[activeModule].searchPlaceholder}
        statusFilter={statusFilter}
        statusOptions={moduleConfig[activeModule].statusOptions}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setCurrentPage(1);
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 sr-only sm:not-sr-only">Rentang:</span>
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setCurrentPage(1);
              }}
              className="admin-input !h-9 !w-auto !py-1 text-xs"
              aria-label="Filter rentang waktu"
            >
              <option value="all">Semua Waktu</option>
              <option value="7_days">7 Hari Terakhir</option>
              <option value="30_days">30 Hari Terakhir</option>
              <option value="90_days">90 Hari Terakhir</option>
              <option value="1_year">1 Tahun Terakhir</option>
            </select>
            {(searchQuery || statusFilter !== "all" || timeRange !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTimeRange("all");
                  setSortKey("");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline px-2 py-1 whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        }
        emptyState={moduleConfig[activeModule].emptyState}
        responsiveCards={true}
        page={safePage}
        pageSize={pageSize}
        total={currentTotal}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 20, 50]}
      >
        {activeModule === "learners" && (
          paginatedLearners.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <td data-label="Nama Pembelajar" className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                {row.name}
              </td>
              <td data-label="Email & Akun" className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                <div>{row.email}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">@{row.username}</div>
              </td>
              <td data-label="Kursus Terdaftar" className="px-4 py-3.5 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.courseName}>
                {row.courseName}
              </td>
              <td data-label="Progres" className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full ${row.progress === 100 ? "bg-emerald-500" : "bg-sky-500"}`}
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{row.progress}%</span>
                </div>
              </td>
              <td data-label="Status" className="px-4 py-3.5">
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
              <td data-label="Tgl Selesai" className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {row.completedAt || "-"}
              </td>
            </tr>
          ))
        )}

        {activeModule === "courses" && (
          paginatedCourses.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <td data-label="ID / Kode" className="px-4 py-3.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                {row.shortName}
              </td>
              <td data-label="Nama Lengkap Kursus" className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-sm truncate" title={row.fullName}>
                {row.fullName}
              </td>
              <td data-label="Kategori" className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                {row.category}
              </td>
              <td data-label="Peserta" className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                {row.totalEnrolled} orang
              </td>
              <td data-label="Kelulusan" className="px-4 py-3.5 text-center">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {row.completionRate}%
                </span>{" "}
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">({row.totalCompleted} lulus)</span>
              </td>
              <td data-label="Status" className="px-4 py-3.5">
                <span className="cuba-badge cuba-badge-success">Aktif Tayang</span>
              </td>
            </tr>
          ))
        )}

        {activeModule === "certificates" && (
          paginatedCertificates.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <td data-label="ID Sertifikat" className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                {row.id}
              </td>
              <td data-label="Penerima & Email" className="px-4 py-3.5">
                <div className="font-bold text-slate-900 dark:text-white">{row.recipientName}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">{row.recipientEmail}</div>
              </td>
              <td data-label="Pelatihan Asal" className="px-4 py-3.5 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.courseName}>
                {row.courseName}
              </td>
              <td data-label="Kode Unik Moodle" className="px-4 py-3.5 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                {row.code}
              </td>
              <td data-label="Tanggal Terbit" className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {row.issuedAt}
              </td>
              <td data-label="Status" className="px-4 py-3.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <AdminIcon name="check" className="h-3 w-3" />
                  <span>{row.status}</span>
                </span>
              </td>
            </tr>
          ))
        )}

        {activeModule === "content" && (
          paginatedContent.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <td data-label="Tipe" className="px-4 py-3.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {row.type}
                </span>
              </td>
              <td data-label="Judul Konten" className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-sm truncate" title={row.title}>
                {row.title}
              </td>
              <td data-label="Penulis / Kurator" className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                {row.author}
              </td>
              <td data-label="Kategori" className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                {row.category}
              </td>
              <td data-label="Tayangan" className="px-4 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {row.views.toLocaleString("id-ID")}
              </td>
              <td data-label="Status" className="px-4 py-3.5">
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
        )}

        {activeModule === "audit" && (
          paginatedAudit.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <td data-label="Waktu Peristiwa" className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {row.timestamp}
              </td>
              <td data-label="Aktor Pengguna" className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                {row.actor}
              </td>
              <td data-label="Aksi / Event" className="px-4 py-3.5 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                {row.action}
              </td>
              <td data-label="Modul" className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                {row.module}
              </td>
              <td data-label="Status" className="px-4 py-3.5">
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
              <td data-label="Keterangan" className="px-4 py-3.5 text-slate-500 dark:text-slate-400 max-w-sm truncate" title={row.details}>
                {row.details}
              </td>
            </tr>
          ))
        )}
      </AdminDataTable>

      {/* 6. Print Footer Stamp */}
      <div className="hidden print:block text-center pt-8 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-bold text-slate-900">Platform Teman Belajar — Dokumen Resmi Laporan Eksekutif</p>
        <p className="mt-1">Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} pukul {new Date().toLocaleTimeString("id-ID")} WIB</p>
      </div>
    </div>
  );
}
