"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { AdminIcon } from "@/components/admin-icon";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNotificationCenter } from "@/components/notification-center";
import { useCubaDisclosureRuntime, useCubaDrawerRuntime } from "@/components/cuba-runtime";
import {
  type NavigationGroup,
  type NavigationItem,
  titleBySegment,
  isItemActive,
  canAccessItem,
  readNavigationGroupsState,
  writeNavigationGroupsState,
} from "@/lib/navigation";

export const navigationGroups: NavigationGroup[] = [
  {
    id: "workspace",
    label: "Ruang Kerja",
    items: [
      { id: "dashboard", href: "/dashboard", label: "Ringkasan", icon: "dashboard" },
      { id: "statistics", href: "/dashboard/statistics", label: "Statistik", icon: "dashboard" },
    ],
  },
  {
    id: "learning",
    label: "Pembelajaran",
    items: [
      { id: "training-programs", href: "/dashboard/training-programs", label: "Program Pelatihan", icon: "knowledge" },
      { id: "microlearning", href: "/dashboard/microlearning", label: "Pembelajaran Singkat", icon: "knowledge" },
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
      { id: "faqs", href: "/dashboard/faqs", label: "FAQ", icon: "folder" },
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

function Brand({ desktopClose }: { desktopClose?: () => void }) {
  return (
    <div className="flex h-[76px] items-center gap-2 border-b admin-sidebar-border px-4">
      <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
        <BrandLogo className="h-11 w-11 shrink-0 object-contain drop-shadow-md" priority />
        <span className="min-w-0">
          <span className="block truncate font-extrabold admin-sidebar-title">Teman Belajar</span>
          <span className="block whitespace-nowrap text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
            Panel Administrasi
          </span>
        </span>
      </Link>
      {desktopClose && (
        <button
          type="button"
          className="admin-sidebar-control hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 lg:grid"
          aria-label="Tutup sidebar admin"
          aria-controls="admin-sidebar"
          aria-expanded="true"
          onClick={desktopClose}
        >
          <AdminIcon name="chevron" className="h-5 w-5 rotate-180" />
        </button>
      )}
    </div>
  );
}

function Sidebar({
  pathname,
  role,
  roles,
  close,
  desktopClose,
}: {
  pathname: string;
  role: string;
  roles?: string[] | null;
  close?: () => void;
  desktopClose?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return typeof window !== "undefined" ? readNavigationGroupsState() : {};
  });

  const toggleGroup = (groupId: string, currentlyExpanded: boolean) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !currentlyExpanded };
      writeNavigationGroupsState(next);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Brand desktopClose={desktopClose} />
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navigasi admin">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessItem(item, roles, role));
          if (visibleItems.length === 0) return null;
          const hasActive = visibleItems.some((item) => isItemActive(item.href, pathname));
          const isExpanded = hasActive || openGroups[group.id] !== false;
          const panelId = `nav-group-${group.id}`;

          return (
            <div key={group.id} className="mb-2">
              <button
                type="button"
                className={`admin-nav-group-toggle flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] transition-colors ${
                  hasActive
                    ? "text-sky-600 dark:text-sky-400 font-extrabold"
                    : "admin-sidebar-section-title hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.id, isExpanded)}
              >
                <span>{group.label}</span>
                <AdminIcon
                  name="chevron"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                />
              </button>
              <div id={panelId} hidden={!isExpanded} className="mt-1 grid gap-0.5">
                {visibleItems.map((item) => {
                  const active = isItemActive(item.href, pathname);
                  return item.disabled ? (
                    <span
                      key={item.id}
                      className="admin-sidebar-link cursor-not-allowed opacity-50"
                      aria-disabled="true"
                    >
                      <AdminIcon name={item.icon} className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto rounded-full admin-sidebar-badge-bg px-2 py-0.5 text-[9px] uppercase">
                        Segera
                      </span>
                    </span>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.href!}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={`admin-sidebar-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? "is-active font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40" : ""
                      }`}
                    >
                      <AdminIcon name={item.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : active ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl border admin-sidebar-border admin-sidebar-box-bg p-4">
        <p className="text-xs font-bold admin-sidebar-title">Alur Kerja Editorial</p>
        <p className="mt-1 text-[11px] leading-5 admin-sidebar-copy">Draf → Peninjauan → Setujui → Terbit → Arsip</p>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  userName,
  userEmail,
  role,
  roles,
}: {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  role: string;
  roles?: string[] | null;
}) {
  const pathname = usePathname();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const initials = (userName || userEmail || "TB").slice(0, 2).toUpperCase();

  const segments = pathname.split("/").filter(Boolean);
  const currentSegment = segments[segments.length - 1] || "dashboard";
  const currentTitle = titleBySegment[currentSegment] || "Dasbor";
  const breadcrumbs = segments.map((segment) => titleBySegment[segment] || segment);

  const searchResults = useMemo(
    () =>
      query.trim().length < 2
        ? []
        : navigationGroups
            .flatMap((group) => group.items)
            .filter(
              (item) =>
                item.href &&
                !item.disabled &&
                canAccessItem(item, roles, role) &&
                item.label.toLowerCase().includes(query.toLowerCase()),
            ),
    [query, roles, role],
  );

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  useCubaDrawerRuntime({
    open: mobileSidebarOpen,
    drawerRef: mobileDrawerRef,
    openerRef: mobileMenuButtonRef,
    onClose: closeMobileSidebar,
  });
  useCubaDisclosureRuntime();

  return (
    <div
      id="pageWrapper"
      data-cuba-template="dashboard-03"
      className={`page-wrapper compact-wrapper dashboard-03-layout cuba-foundation min-h-screen lg:grid ${
        desktopSidebarOpen ? "lg:grid-cols-[255px_1fr]" : "lg:grid-cols-[1fr]"
      }`}
    >
      {desktopSidebarOpen && (
        <aside
          id="admin-sidebar"
          className="sidebar-wrapper admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-[255px] lg:block"
          data-sidebar-layout="stroke-svg"
        >
          <Sidebar
            pathname={pathname}
            role={role}
            roles={roles}
            desktopClose={() => setDesktopSidebarOpen(false)}
          />
        </aside>
      )}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Tutup navigasi admin"
            aria-controls="admin-mobile-sidebar"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            ref={mobileDrawerRef}
            id="admin-mobile-sidebar"
            className="admin-sidebar relative h-full w-[min(86vw,310px)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi admin"
            tabIndex={-1}
          >
            <button
              type="button"
              className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg border admin-sidebar-border admin-sidebar-copy"
              aria-label="Tutup navigasi admin"
              aria-controls="admin-mobile-sidebar"
              aria-expanded="true"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <AdminIcon name="close" className="h-5 w-5" />
            </button>
            <Sidebar
              pathname={pathname}
              role={role}
              roles={roles}
              close={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </div>
      )}
      <div className={`page-body-wrapper min-w-0 ${desktopSidebarOpen ? "lg:col-start-2" : "lg:col-start-1"}`}>
        <header className="page-header admin-topbar sticky top-0 z-30 border-b backdrop-blur">
          {/* Bar 1: Topbar (h-[76px]) */}
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className="admin-menu-button grid h-10 w-10 place-items-center rounded-xl border lg:hidden"
              aria-label="Buka navigasi admin"
              aria-controls="admin-mobile-sidebar"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <AdminIcon name="menu" className="h-5 w-5" />
            </button>
            {!desktopSidebarOpen && (
              <button
                type="button"
                className="admin-menu-button hidden h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold lg:inline-flex"
                aria-label="Buka sidebar admin"
                aria-controls="admin-sidebar"
                aria-expanded="false"
                onClick={() => setDesktopSidebarOpen(true)}
              >
                <AdminIcon name="menu" className="h-5 w-5" />
                <span className="hidden xl:inline">Buka sidebar</span>
              </button>
            )}
            <div className="relative hidden max-w-md flex-1 md:block">
              <AdminIcon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <label htmlFor="admin-module-search" className="sr-only">
                Cari modul admin
              </label>
              <input
                id="admin-module-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="admin-topbar-search"
                placeholder="Cari modul admin…"
              />
              {searchResults.length > 0 && (
                <div className="admin-search-results">
                  {searchResults.map((item) => (
                    <Link key={item.href} href={item.href!} onClick={() => setQuery("")}>
                      <AdminIcon name={item.icon} className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <AdminNotificationCenter />
              <details className="relative admin-profile-dropdown">
                <summary className="group flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800/50">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sm font-black text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                    {initials}
                  </span>
                  <span className="hidden text-left xl:block">
                    <span className="block max-w-40 truncate text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-400">
                      {userName || userEmail}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{role}</span>
                  </span>
                  <AdminIcon name="chevron" className="hidden h-4 w-4 text-slate-400 xl:block" />
                </summary>
                <div className="admin-profile-menu">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {userName || "Pengguna Teman Belajar"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
                  </div>
                  <Link href="/api/auth/federated-logout" prefetch={false}>
                    Keluar dari Admin
                  </Link>
                </div>
              </details>
            </div>
          </div>

          {/* Bar 2: Cuba Page Title & Breadcrumb Bar (h-[60px]) */}
          <div className="flex h-[60px] items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
            <div className="flex items-baseline gap-4 min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {currentTitle}
              </h1>
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/dashboard" className="font-bold text-sky-700 dark:text-sky-400 hover:underline">
                  Admin
                </Link>
                {breadcrumbs.slice(1).map((crumb, idx) => (
                  <span key={`${crumb}-${idx}`} className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    <span className={idx === breadcrumbs.length - 2 ? "font-semibold text-slate-700 dark:text-slate-200" : ""}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/40" aria-hidden="true" />
              <span className="hidden md:inline">Data diperbarui baru saja</span>
            </div>
          </div>
        </header>

        <main
          id="admin-content"
          className="page-body container-fluid min-h-[calc(100vh-196px)] p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
        <footer className="footer admin-footer">
          <span className="flex items-center gap-2">
            <BrandLogo className="h-7 w-7 shrink-0 object-contain" />© {new Date().getFullYear()} Teman Belajar
          </span>
          <span>Panel Administrasi · pengalaman perusahaan</span>
        </footer>
      </div>
    </div>
  );
}
