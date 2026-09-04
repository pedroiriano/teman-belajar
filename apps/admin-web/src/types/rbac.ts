export type PermissionAction = "read" | "create" | "edit" | "review" | "publish" | "delete";

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, { label: string; description: string }> = {
  read: { label: "Lihat", description: "Membaca dan meninjau data modul" },
  create: { label: "Buat", description: "Membuat draf atau entitas baru" },
  edit: { label: "Edit", description: "Memperbarui data atau draf yang ada" },
  review: { label: "Tinjau", description: "Meninjau draf dan memberikan catatan peninjau" },
  publish: { label: "Terbitkan", description: "Merilis konten langsung ke publik atau arsip" },
  delete: { label: "Hapus", description: "Menghapus atau mengarsipkan data secara permanen" },
};

export type ModuleCategory = "Konten & Editorial" | "Pembelajaran" | "Ruang Kerja" | "Administrasi Platform";

export interface PermissionModule {
  id: string;
  name: string;
  category: ModuleCategory;
  description: string;
  supportedActions: PermissionAction[];
}

export const PLATFORM_MODULES: PermissionModule[] = [
  // 1. Konten & Editorial
  {
    id: "knowledge",
    name: "Pusat Pengetahuan",
    category: "Konten & Editorial",
    description: "Artikel, dokumentasi panduan, dan materi referensi",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },
  {
    id: "news",
    name: "Warta & Berita",
    category: "Konten & Editorial",
    description: "Publikasi berita kegiatan dan siaran resmi portal",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },
  {
    id: "announcements",
    name: "Pengumuman Platform",
    category: "Konten & Editorial",
    description: "Pemberitahuan darurat, banner, dan informasi luas",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },
  {
    id: "media-gallery",
    name: "Pustaka & Galeri Media",
    category: "Konten & Editorial",
    description: "Berkas gambar, aset video, dan dokumen terunggah",
    supportedActions: ["read", "create", "edit", "delete"],
  },

  // 2. Pembelajaran
  {
    id: "training-programs",
    name: "Program Pelatihan",
    category: "Pembelajaran",
    description: "Kurikulum terstruktur, cohort, dan silabus pelatihan",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },
  {
    id: "microlearning",
    name: "Pembelajaran Singkat",
    category: "Pembelajaran",
    description: "Modul bite-sized, video materi, dan kuis ringkas",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },
  {
    id: "learning-paths",
    name: "Jalur Belajar",
    category: "Pembelajaran",
    description: "Alur prasyarat kompetensi dan tahapan bertingkat",
    supportedActions: ["read", "create", "edit", "review", "publish", "delete"],
  },

  // 3. Ruang Kerja
  {
    id: "workflow",
    name: "Papan Alur Kerja",
    category: "Ruang Kerja",
    description: "Kanban visual siklus editorial draf hingga terbit",
    supportedActions: ["read", "edit"],
  },
  {
    id: "review-queue",
    name: "Antrean Peninjauan",
    category: "Ruang Kerja",
    description: "Verifikasi kelayakan editorial dan keputusan persetujuan",
    supportedActions: ["read", "review", "publish"],
  },
  {
    id: "schedule",
    name: "Jadwal Publikasi",
    category: "Ruang Kerja",
    description: "Kalender rilis terjadwal dan pencegahan konflik slot",
    supportedActions: ["read", "create", "edit", "delete"],
  },
  {
    id: "statistics",
    name: "Statistik & Observabilitas",
    category: "Ruang Kerja",
    description: "Analitik tren kunjungan, engagement, dan ekspor laporan",
    supportedActions: ["read"],
  },

  // 4. Administrasi Platform
  {
    id: "users",
    name: "Manajemen Pengguna",
    category: "Administrasi Platform",
    description: "Akun staf, penetapan peran, dan kredensial akses",
    supportedActions: ["read", "create", "edit", "delete"],
  },
  {
    id: "roles",
    name: "Peran & Izin Akses (RBAC)",
    category: "Administrasi Platform",
    description: "Tata kelola matriks izin dan pembuatan peran kustom",
    supportedActions: ["read", "create", "edit", "delete"],
  },
  {
    id: "integration-health",
    name: "Kesehatan Integrasi",
    category: "Administrasi Platform",
    description: "Pemantauan probe dependensi layanan dan SLA",
    supportedActions: ["read"],
  },
  {
    id: "audit",
    name: "Pusat Audit Keamanan",
    category: "Administrasi Platform",
    description: "Log aktivitas forensik dan jejak perubahan sistem",
    supportedActions: ["read"],
  },
  {
    id: "platform-configuration",
    name: "Konfigurasi Platform",
    category: "Administrasi Platform",
    description: "Pengaturan global, feature flags, dan mode pemeliharaan",
    supportedActions: ["read", "edit", "publish"],
  },
];

export interface RolePolicy {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: Record<string, PermissionAction[]>;
  updatedAt: string;
}

export interface RbacOverviewKPI {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  totalModules: number;
}
