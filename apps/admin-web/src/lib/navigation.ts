import type { AdminIconName } from "@/components/admin-icon";

export interface NavigationItem {
  id: string;
  href?: string;
  label: string;
  icon: AdminIconName;
  badge?: string;
  disabled?: boolean;
  requiredRole?: string;
  requiredAnyRole?: string[];
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: "workspace",
    label: "Ruang Kerja",
    items: [
      { id: "dashboard", href: "/dashboard", label: "Ringkasan", icon: "dashboard" },
      { id: "workflow", href: "/dashboard/workflow", label: "Alur Kerja", icon: "audit" },
      { id: "review-queue", href: "/dashboard/review-queue", label: "Antrean Peninjauan", icon: "check" },
      { id: "schedule", href: "/dashboard/schedule", label: "Jadwal Publikasi", icon: "calendar" },
      { id: "statistics", href: "/dashboard/statistics", label: "Statistik", icon: "grid" },
    ],
  },
  {
    id: "learning",
    label: "Pembelajaran",
    items: [
      { id: "training-programs", href: "/dashboard/training-programs", label: "Program Pelatihan", icon: "book" },
      { id: "microlearning", href: "/dashboard/microlearning", label: "Pembelajaran Singkat", icon: "video" },
      { id: "learning-paths", href: "/dashboard/learning-paths", label: "Jalur Belajar", icon: "knowledge" },
    ],
  },
  {
    id: "content",
    label: "Konten & Informasi",
    items: [
      { id: "knowledge", href: "/dashboard/knowledge", label: "Pusat Pengetahuan", icon: "file" },
      { id: "news", href: "/dashboard/news", label: "Berita", icon: "news" },
      { id: "announcements", href: "/dashboard/announcements", label: "Pengumuman", icon: "announcement" },
      { id: "faqs", href: "/dashboard/faqs", label: "FAQ", icon: "help" },
    ],
  },
  {
    id: "assets",
    label: "Struktur & Aset",
    items: [
      { id: "knowledge-hierarchy", href: "/dashboard/knowledge-hierarchy", label: "Struktur Pengetahuan", icon: "folder" },
      { id: "taxonomy", href: "/dashboard/taxonomy", label: "Taksonomi & SEO", icon: "folder" },
      { id: "media", href: "/dashboard/media", label: "Pustaka Media", icon: "media" },
      { id: "media-gallery", href: "/dashboard/media-gallery", label: "Galeri Media", icon: "media" },
    ],
  },
  {
    id: "platform",
    label: "Administrasi Platform",
    items: [
      { id: "users", href: "/dashboard/users", label: "Pengguna & Profil", icon: "users" },
      {
        id: "roles",
        href: "/dashboard/roles",
        label: "Peran & Izin Akses",
        icon: "users",
        requiredRole: "Portal Administrator",
        requiredAnyRole: ["Portal Administrator"],
      },
      {
        id: "integration-health",
        href: "/dashboard/integration-health",
        label: "Kesehatan Integrasi",
        icon: "health",
        requiredRole: "Portal Administrator",
        requiredAnyRole: ["Portal Administrator"],
      },
      {
        id: "audit",
        href: "/dashboard/audit",
        label: "Audit",
        icon: "audit",
        requiredRole: "Portal Administrator",
        requiredAnyRole: ["Portal Administrator"],
      },
      {
        id: "platform-configuration",
        href: "/dashboard/platform-configuration",
        label: "Konfigurasi",
        icon: "settings",
        requiredRole: "Portal Administrator",
        requiredAnyRole: ["Portal Administrator"],
      },
    ],
  },
];

export const titleBySegment: Record<string, string> = {
  dashboard: "Dasbor",
  workflow: "Alur Kerja",
  "review-queue": "Antrean Peninjauan",
  schedule: "Jadwal Publikasi",
  statistics: "Statistik",
  "integration-health": "Kesehatan Integrasi",
  audit: "Audit",
  "platform-configuration": "Konfigurasi Platform",
  knowledge: "Pusat Pengetahuan",
  "knowledge-hierarchy": "Struktur Pengetahuan",
  news: "Berita",
  announcements: "Pengumuman",
  media: "Pustaka Media",
  "media-gallery": "Galeri Media & Video Hub",
  taxonomy: "Taksonomi & SEO",
  faqs: "FAQ",
  users: "Pengguna & Profil",
  roles: "Peran & Izin Akses",
  "training-programs": "Program Pelatihan",
  microlearning: "Pembelajaran Singkat",
  "learning-paths": "Jalur Belajar",
  notifications: "Pusat Notifikasi",
  create: "Buat baru",
};

export function isItemActive(href: string | undefined, pathname: string): boolean {
  if (!href) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessItem(item: NavigationItem, userRoles?: string[] | null, fallbackRole?: string): boolean {
  const roles = userRoles && userRoles.length > 0 ? userRoles : fallbackRole ? [fallbackRole] : [];
  if (item.requiredAnyRole && item.requiredAnyRole.length > 0) {
    return item.requiredAnyRole.some((role) => roles.includes(role));
  }
  if (item.requiredRole) {
    return roles.includes(item.requiredRole);
  }
  return true;
}

const NAVIGATION_GROUPS_STORAGE_KEY = "teman-belajar-navigation-groups-v1";

export function readNavigationGroupsState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NAVIGATION_GROUPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function writeNavigationGroupsState(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAVIGATION_GROUPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical persistence
  }
}
