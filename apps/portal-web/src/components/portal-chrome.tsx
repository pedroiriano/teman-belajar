"use client";

/* eslint-disable @next/next/no-img-element -- configured image is a validated Media endpoint */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { PortalIcon } from "@/components/portal-icon";
import { SilentSsoBridge } from "@/components/silent-sso-bridge";
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalNotificationCenter } from "@/components/notification-center";
import { useTechwindRuntime } from "@/components/techwind-runtime";
import type { PublicPlatformConfiguration } from "@/lib/platform-configuration";

type NavigationItem = { href?: string; label: string; description: string; comingSoon?: boolean };
type NavigationGroup = { label: string; items: NavigationItem[] };

const navigationGroups: NavigationGroup[] = [
  {
    label: "Pembelajaran",
    items: [
      { href: "/my-learning", label: "Pembelajaran Saya", description: "Lanjutkan kelas dan pantau progres." },
      { href: "/search?content_type=course", label: "Cari Kelas", description: "Temukan katalog kelas Moodle." },
      { href: "/training-programs", label: "Pelatihan Penuh", description: "Program terstruktur dengan course dan cohort." },
      { href: "/microlearning", label: "Pembelajaran Singkat", description: "Materi editorial terkurasi selama 3–15 menit." },
      { label: "Webinar", description: "Sesi langsung bersama narasumber.", comingSoon: true },
      { href: "/learning-paths", label: "Jalur Belajar", description: "Rangkaian kompetensi yang terarah." },
    ],
  },
  {
    label: "Pengetahuan",
    items: [
      { href: "/knowledge", label: "Pusat Pengetahuan", description: "Panduan dan praktik terbaik terkurasi." },
      { href: "/search?content_type=knowledge", label: "Cari Pengetahuan", description: "Cari jawaban berdasarkan kebutuhan." },
    ],
  },
  {
    label: "Informasi",
    items: [
      { href: "/news", label: "Berita", description: "Cerita dan perkembangan organisasi." },
      { href: "/announcements", label: "Pengumuman", description: "Informasi penting dan jadwal terbaru." },
      { href: "/media-gallery", label: "Media", description: "Galeri foto dan video terkurasi." },
      { href: "/help", label: "FAQ", description: "Jawaban terkurasi dan mudah dicari." },
    ],
  },
];

function NavigationGroupItems({ group, mobile = false }: { group: NavigationGroup; mobile?: boolean }) {
  return (
    <div className={mobile ? "grid gap-1 pb-2" : "portal-nav-dropdown-grid"}>
      {group.items.map((item) => item.href ? (
        <Link key={item.label} href={item.href} className={mobile ? "portal-mobile-submenu-link" : "portal-nav-dropdown-link"}>
          <span className="font-extrabold">{item.label}</span>
          <span>{item.description}</span>
        </Link>
      ) : (
        <span key={item.label} className={mobile ? "portal-mobile-submenu-link is-disabled" : "portal-nav-dropdown-link is-disabled"} aria-disabled="true">
          <span className="flex items-center gap-2 font-extrabold">{item.label}<span className="portal-coming-soon">Segera</span></span>
          <span>{item.description}</span>
        </span>
      ))}
    </div>
  );
}

function Brand({ inverted = false, configuration }: { inverted?: boolean; configuration: PublicPlatformConfiguration }) {
  const configuredLogo = configuration.identity.logo_media_id ? `/api/v1/media/${encodeURIComponent(configuration.identity.logo_media_id)}/content` : "";
  return (
    <Link href="/" className="logo group flex shrink-0 items-center gap-3" aria-label="Teman Belajar — Beranda">
      {configuredLogo ? <img src={configuredLogo} alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-md transition group-hover:-rotate-3" /> : <BrandLogo className="h-12 w-12 shrink-0 object-contain drop-shadow-md transition group-hover:-rotate-3" priority={!inverted} />}
      <span>
        <span className={`block text-lg font-extrabold leading-5 ${inverted ? "text-white" : "text-slate-900"}`}>Teman Belajar</span>
        <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${inverted ? "text-teal-300" : "text-teal-700"}`}>{configuration.identity.tagline}</span>
      </span>
    </Link>
  );
}

export function PortalChrome({ authenticated, configuration, children }: { authenticated: boolean; configuration: PublicPlatformConfiguration; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { menuOpen, navSticky, showBackToTop, toggleMenu, scrollToTop } = useTechwindRuntime(`${pathname}?${searchParams}`);
  const featureForHref = (href: string) => { const key = href.startsWith("/training-programs") ? "training_programs" : href.startsWith("/microlearning") ? "microlearning" : href.startsWith("/learning-paths") ? "learning_paths" : href.startsWith("/media-gallery") ? "media_gallery" : href.startsWith("/knowledge") ? "knowledge" : href.startsWith("/news") ? "news" : href.startsWith("/announcements") ? "announcements" : href.startsWith("/help") ? "faq" : href.startsWith("/search") ? "search" : ""; return configuration.features.find((feature) => feature.key === key); };
  const configuredItems = configuration.navigation.map((item) => ({ item, feature: featureForHref(item.href) })).filter(({ item, feature }) => item.visible && feature?.visible !== false).map(({ item, feature }) => ({ href: item.href, label: feature?.label || item.label, description: item.description || feature?.label || item.label }));
  const effectiveNavigationGroups: NavigationGroup[] = configuredItems.length ? [{ label: "Jelajahi", items: configuredItems }, { label: "Selanjutnya", items: [{ label: "Webinar", description: "Sesi langsung bersama narasumber.", comingSoon: true }] }] : navigationGroups;

  const active = (href: string) => {
    const basePath = href.split(/[?#]/)[0];
    return basePath === "/" ? pathname === "/" : pathname.startsWith(basePath);
  };

  const isGroupActive = (group: NavigationGroup) => group.items.some(item => {
    if (!item.href) return false;
    const parts = item.href.split(/[?#]/);
    const basePath = parts[0];
    if (basePath === "/" || basePath === "") return false;
    if (!pathname.startsWith(basePath)) return false;
    
    // If the navigation item has a query string, ensure every parameter matches
    const queryPart = item.href.split("?")[1]?.split("#")[0];
    if (queryPart) {
      const itemParams = new URLSearchParams(queryPart);
      let match = true;
      itemParams.forEach((value, key) => {
        if (searchParams.get(key) !== value) {
          match = false;
        }
      });
      if (!match) return false;
    } else {
      // If the navigation item DOES NOT have a query string, but we are on a path with a query string,
      // and it's an exact match on basePath, we might want to return false if it's a specific route like /search
      // But for things like /knowledge we want it to match /knowledge/article-1
      if (basePath === "/search" && searchParams.toString() !== "") {
          return false;
      }
    }
    return true;
  });

  if (pathname.startsWith("/sso/")) return <main>{children}</main>;

  return (
    <>
      <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten utama</a>
      {!authenticated ? <SilentSsoBridge /> : null}
      <header id="topnav" className={`techwind-topnav portal-header defaultscroll sticky top-0 z-50 border-b backdrop-blur ${navSticky ? "nav-sticky" : ""}`}>
        <div className="portal-container flex h-[76px] items-center justify-between gap-4">
          <div className="flex flex-1 items-center justify-start">
            <Brand configuration={configuration} />
          </div>
          <nav id="navigation" className="navigation-menu hidden items-center justify-center gap-1 xl:flex" aria-label="Navigasi utama">
            <Link href="/" aria-current={active("/") ? "page" : undefined} className={`portal-nav-link ${active("/") ? "is-active" : ""}`}>Beranda</Link>
            {effectiveNavigationGroups.map((group) => (
              <details key={group.label} className="portal-nav-group">
                <summary className={`portal-nav-link ${isGroupActive(group) ? "is-active" : ""}`}>
                  {group.label}<PortalIcon name="chevron-down" className="h-4 w-4" />
                </summary>
                <div className="portal-nav-dropdown"><NavigationGroupItems group={group} /></div>
              </details>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-2 xl:ml-4">
            <form action="/search" method="GET" role="search" className="relative hidden 2xl:block">
              <label htmlFor="portal-search" className="sr-only">Cari di Teman Belajar</label>
              <PortalIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="portal-search" type="search" name="q" required maxLength={200} placeholder="Cari konten dan kelas" className="portal-search-input w-56" />
            </form>
            <ThemeToggle />
            {authenticated ? <PortalNotificationCenter /> : null}
            {authenticated ? (
              <Link href="/api/auth/federated-logout" prefetch={false} className="portal-button-secondary hidden sm:inline-flex">Keluar</Link>
            ) : (
              <Link href="/api/auth/signin?callbackUrl=/" className="portal-button-primary hidden sm:inline-flex">Masuk</Link>
            )}
            <button id="isToggle" type="button" className={`navbar-toggle portal-menu-button grid h-11 w-11 place-items-center rounded-xl border xl:hidden ${menuOpen ? "open" : ""}`} aria-label={menuOpen ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={menuOpen} aria-controls="portal-mobile-navigation" onClick={toggleMenu}>
              <PortalIcon name={menuOpen ? "close" : "menu"} className="h-6 w-6" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div id="portal-mobile-navigation" className="portal-mobile-menu border-t xl:hidden">
            <div className="portal-container py-4">
              <form action="/search" method="GET" role="search" className="relative mb-3">
                <label htmlFor="portal-mobile-search" className="sr-only">Cari di Teman Belajar</label>
                <PortalIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="portal-mobile-search" type="search" name="q" required maxLength={200} placeholder="Cari konten dan kelas" className="portal-search-input w-full" />
              </form>
              <nav className="grid gap-1 sm:grid-cols-2" aria-label="Navigasi seluler">
                <Link href="/" aria-current={active("/") ? "page" : undefined} className={`portal-mobile-link ${active("/") ? "is-active" : ""}`}>Beranda</Link>
                {effectiveNavigationGroups.map((group) => (
                  <details key={group.label} className="portal-mobile-group sm:col-span-2">
                    <summary className={`portal-mobile-link ${isGroupActive(group) ? "is-active" : ""}`}>{group.label}<PortalIcon name="chevron-down" className="h-4 w-4" /></summary>
                    <NavigationGroupItems group={group} mobile />
                  </details>
                ))}
              </nav>
              <div className="mt-4 border-t border-slate-100 pt-4">
                {authenticated ? <Link href="/api/auth/federated-logout" prefetch={false} className="portal-button-primary w-full">Keluar</Link> : <Link href="/api/auth/signin?callbackUrl=/" className="portal-button-primary w-full">Masuk ke akun</Link>}
              </div>
            </div>
          </div>
        )}
      </header>
      <main id="main-content">{children}</main>
      <footer className="techwind-footer portal-footer border-t border-slate-800 bg-[#102a43] text-slate-300">
        <div className="portal-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr]">
          <div><Brand inverted configuration={configuration} /><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">{configuration.footer.summary}</p></div>
          <div><h2 className="text-sm font-bold text-white">Jelajahi</h2><div className="mt-4 grid gap-3 text-sm">{configuration.footer.links.filter((item) => item.visible).map((item) => <Link key={`${item.label}-${item.href}`} href={item.href}>{item.label}</Link>)}</div></div>
          <div><h2 className="text-sm font-bold text-white">Bantuan</h2><div className="mt-4 grid gap-3 text-sm"><Link href={configuration.contact.help_href}>{configuration.contact.help_label}</Link>{configuration.contact.email ? <a href={`mailto:${configuration.contact.email}`}>{configuration.contact.email}</a> : null}</div></div>
          <div><h2 className="text-sm font-bold text-white">Fondasi platform</h2><p className="mt-4 text-sm leading-7 text-slate-400">Composable LXP + Moodle LMS dengan identitas terpusat dan pengalaman yang aman.</p></div>
        </div>
        <div className="border-t border-white/10"><div className="portal-container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Teman Belajar.</span><span>Platform Pengalaman Belajar Digital Perusahaan</span></div></div>
      </footer>
      <button type="button" id="back-to-top" className={`techwind-back-to-top portal-back-to-top ${showBackToTop ? "is-visible" : ""}`} onClick={scrollToTop} aria-label="Kembali ke atas">
        <PortalIcon name="arrow-up" className="h-5 w-5" />
      </button>
    </>
  );
}

