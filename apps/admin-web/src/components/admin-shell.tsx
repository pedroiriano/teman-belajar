"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AdminIcon, type AdminIconName } from "@/components/admin-icon";
import { ThemeToggle } from "@/components/theme-toggle";

type NavigationItem = { href?: string; label: string; icon: AdminIconName; disabled?: boolean };

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  { label: "Ruang Kerja", items: [{ href: "/dashboard", label: "Ringkasan", icon: "dashboard" }, { href: "/dashboard/statistics", label: "Statistik", icon: "dashboard" }] },
  { label: "Konten", items: [
    { href: "/dashboard/knowledge", label: "Pusat Pengetahuan", icon: "knowledge" },
    { href: "/dashboard/knowledge-hierarchy", label: "Struktur Pengetahuan", icon: "folder" },
    { href: "/dashboard/news", label: "Berita", icon: "news" },
    { href: "/dashboard/announcements", label: "Pengumuman", icon: "announcement" },
    { href: "/dashboard/media", label: "Pustaka Media", icon: "media" },
    { href: "/dashboard/taxonomy", label: "Taksonomi & SEO", icon: "folder" },
  ] },
  { label: "Platform", items: [
    { href: "/dashboard/faqs", label: "FAQ", icon: "folder" },
    { href: "/dashboard/users", label: "Pengguna & Profil", icon: "users" },
    { label: "Kesehatan Integrasi", icon: "health", disabled: true },
    { label: "Audit", icon: "audit", disabled: true },
    { label: "Konfigurasi", icon: "settings", disabled: true },
  ] },
];

const titleBySegment: Record<string, string> = {
  dashboard: "Dasbor",
  statistics: "Statistik",
  knowledge: "Pusat Pengetahuan",
  "knowledge-hierarchy": "Struktur Pengetahuan",
  news: "Berita",
  announcements: "Pengumuman",
  media: "Pustaka Media",
  taxonomy: "Taksonomi & SEO",
  faqs: "FAQ",
  users: "Pengguna & Profil",
  create: "Buat baru",
};

function Brand({ desktopClose }: { desktopClose?: () => void }) {
  return (
    <div className="flex h-[76px] items-center gap-2 border-b admin-sidebar-border px-4">
      <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
        <span className="admin-brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black shadow-lg shadow-sky-500/20">TB</span>
        <span className="min-w-0">
          <span className="block truncate font-extrabold admin-sidebar-title">Teman Belajar</span>
          <span className="block truncate text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Panel Administrasi</span>
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

function Sidebar({ pathname, close, desktopClose }: { pathname: string; close?: () => void; desktopClose?: () => void }) {
  const isActive = (href?: string) => href ? href === "/dashboard" ? pathname === href : pathname.startsWith(href) : false;
  return (
    <div className="flex h-full flex-col">
      <Brand desktopClose={desktopClose} />
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
        {navigationGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[.2em] admin-sidebar-section-title">{group.label}</p>
            <div className="grid gap-1">
              {group.items.map((item) => item.disabled ? (
                <span key={item.label} className="admin-sidebar-link cursor-not-allowed opacity-50" aria-disabled="true">
                  <AdminIcon name={item.icon} className="h-5 w-5" />
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full admin-sidebar-badge-bg px-2 py-0.5 text-[9px] uppercase">Segera</span>
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={close}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`admin-sidebar-link ${isActive(item.href) ? "is-active" : ""}`}
                >
                  <AdminIcon name={item.icon} className="h-5 w-5" />
                  <span>{item.label}</span>
                  {isActive(item.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl border admin-sidebar-border admin-sidebar-box-bg p-4">
        <p className="text-xs font-bold admin-sidebar-title">Alur Kerja Editorial</p>
        <p className="mt-1 text-[11px] leading-5 admin-sidebar-copy">Draft → Review → Setujui → Terbit → Arsip</p>
      </div>
    </div>
  );
}

export function AdminShell({ children, userName, userEmail, role }: { children: ReactNode; userName?: string | null; userEmail?: string | null; role: string }) {
  const pathname = usePathname();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const initials = (userName || userEmail || "TB").slice(0, 2).toUpperCase();
  const breadcrumbs = pathname.split("/").filter(Boolean).map((segment) => titleBySegment[segment] || segment);
  const searchResults = useMemo(
    () => query.trim().length < 2 ? [] : navigationGroups.flatMap((group) => group.items).filter((item) => item.href && item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const opener = mobileMenuButtonRef.current;
    document.body.style.overflow = "hidden";
    const drawer = mobileDrawerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => element.getClientRects().length > 0);
    window.requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        drawer?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const details = document.querySelector<HTMLDetailsElement>('details.admin-profile-dropdown');
      if (details && details.hasAttribute('open') && !details.contains(event.target as Node)) {
        details.removeAttribute('open');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`min-h-screen lg:grid ${desktopSidebarOpen ? "lg:grid-cols-[276px_1fr]" : "lg:grid-cols-[1fr]"}`}>
      {desktopSidebarOpen && (
        <aside id="admin-sidebar" className="admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-[276px] lg:block">
          <Sidebar pathname={pathname} desktopClose={() => setDesktopSidebarOpen(false)} />
        </aside>
      )}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Tutup navigasi admin" aria-controls="admin-mobile-sidebar" onClick={() => setMobileSidebarOpen(false)} />
          <aside ref={mobileDrawerRef} id="admin-mobile-sidebar" className="admin-sidebar relative h-full w-[min(86vw,310px)] shadow-2xl" role="dialog" aria-modal="true" aria-label="Navigasi admin" tabIndex={-1}>
            <button type="button" className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg border admin-sidebar-border admin-sidebar-copy" aria-label="Tutup navigasi admin" aria-controls="admin-mobile-sidebar" aria-expanded="true" onClick={() => setMobileSidebarOpen(false)}>
              <AdminIcon name="close" className="h-5 w-5" />
            </button>
            <Sidebar pathname={pathname} close={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}
      <div className={`min-w-0 ${desktopSidebarOpen ? "lg:col-start-2" : "lg:col-start-1"}`}>
        <header className="admin-topbar sticky top-0 z-30 border-b backdrop-blur">
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button ref={mobileMenuButtonRef} type="button" className="admin-menu-button grid h-10 w-10 place-items-center rounded-xl border lg:hidden" aria-label="Buka navigasi admin" aria-controls="admin-mobile-sidebar" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)}>
              <AdminIcon name="menu" className="h-5 w-5" />
            </button>
            {!desktopSidebarOpen && (
              <button type="button" className="admin-menu-button hidden h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold lg:inline-flex" aria-label="Buka sidebar admin" aria-controls="admin-sidebar" aria-expanded="false" onClick={() => setDesktopSidebarOpen(true)}>
                <AdminIcon name="menu" className="h-5 w-5" />
                <span className="hidden xl:inline">Buka sidebar</span>
              </button>
            )}
            <div className="relative hidden max-w-md flex-1 md:block">
              <AdminIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="admin-module-search" className="sr-only">Cari modul admin</label>
              <input id="admin-module-search" value={query} onChange={(event) => setQuery(event.target.value)} className="admin-topbar-search" placeholder="Cari modul admin…" />
              {searchResults.length > 0 && <div className="admin-search-results">{searchResults.map((item) => <Link key={item.href} href={item.href!} onClick={() => setQuery("")}><AdminIcon name={item.icon} className="h-4 w-4" />{item.label}</Link>)}</div>}
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <button type="button" className="admin-icon-button hidden sm:grid" aria-label="Notifikasi" title="Notifikasi belum diaktifkan"><AdminIcon name="bell" className="h-5 w-5" /></button>
              <details className="relative admin-profile-dropdown">
                <summary className="group flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800/50">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sm font-black text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{initials}</span>
                  <span className="hidden text-left xl:block"><span className="block max-w-40 truncate text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-400">{userName || userEmail}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{role}</span></span>
                  <AdminIcon name="chevron" className="hidden h-4 w-4 text-slate-400 xl:block" />
                </summary>
                <div className="admin-profile-menu"><div className="border-b border-slate-100 p-4 dark:border-slate-800"><p className="text-sm font-bold text-slate-900 dark:text-slate-100">{userName || "Pengguna Teman Belajar"}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{userEmail}</p></div><Link href="/api/auth/federated-logout" prefetch={false}>Keluar dari Admin</Link></div>
              </details>
            </div>
          </div>
          <div className="flex min-h-11 items-center gap-2 border-t px-4 text-xs text-slate-500 sm:px-6 lg:px-8"><Link href="/dashboard" className="font-bold text-sky-700">Admin</Link>{breadcrumbs.slice(1).map((crumb) => <span key={crumb} className="flex items-center gap-2"><span aria-hidden="true">/</span><span>{crumb}</span></span>)}</div>
        </header>
        <main id="admin-content" className="min-h-[calc(100vh-154px)] p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="admin-footer"><span>© {new Date().getFullYear()} Teman Belajar</span><span>Admin Console · Cuba-derived experience</span></footer>
      </div>
    </div>
  );
}


