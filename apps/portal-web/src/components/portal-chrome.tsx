"use client";

/* eslint-disable @next/next/no-img-element -- configured image is a validated Media endpoint */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { PortalIcon } from "@/components/portal-icon";
import { SilentSsoBridge } from "@/components/silent-sso-bridge";
import { SearchField } from "@/components/techwind";
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalNotificationCenter } from "@/components/notification-center";
import { useTechwindRuntime } from "@/components/techwind-runtime";
import type { PublicPlatformConfiguration } from "@/lib/platform-configuration";

type NavigationItem = { href?: string; label: string; description: string; comingSoon?: boolean };
type NavigationSection = { label?: string; items: NavigationItem[] };
type NavigationGroup = { label: string; variant: "mega" | "simple"; sections: NavigationSection[] };

const navigationGroups: NavigationGroup[] = [
  {
    label: "Pembelajaran",
    variant: "mega",
    sections: [
      {
        label: "Untuk Siswa",
        items: [
          { href: "/my-learning", label: "Koleksi Saya", description: "Bookmark, kelas, dan progres personal." },
          { href: "/search?content_type=course", label: "Cari Kelas", description: "Temukan katalog kelas Moodle." },
          { href: "/training-programs", label: "Pelatihan Penuh", description: "Program pelatihan terstruktur." },
        ],
      },
      {
        label: "Konten & Sesi",
        items: [
          { href: "/microlearning", label: "Pembelajaran Singkat", description: "Materi editorial 3–15 menit." },
          { label: "Webinar", description: "Sesi langsung bersama narasumber.", comingSoon: true },
          { href: "/learning-paths", label: "Jalur Belajar", description: "Rangkaian kompetensi terarah." },
        ],
      },
    ],
  },
  {
    label: "Pengetahuan",
    variant: "simple",
    sections: [
      {
        items: [
          { href: "/knowledge", label: "Pusat Pengetahuan", description: "Panduan dan praktik terbaik terkurasi." },
          { href: "/search?content_type=knowledge", label: "Cari Materi", description: "Cari jawaban berdasarkan kebutuhan." },
        ],
      },
    ],
  },
  {
    label: "Informasi",
    variant: "mega",
    sections: [
      {
        label: "Media & Berita",
        items: [
          { href: "/news", label: "Berita", description: "Informasi dan perkembangan terkini." },
          { href: "/announcements", label: "Pengumuman", description: "Pemberitahuan resmi organisasi." },
        ],
      },
      {
        label: "Bantuan",
        items: [
          { href: "/media-gallery", label: "Media", description: "Galeri kegiatan dan dokumentasi." },
          { href: "/help", label: "FAQ", description: "Pertanyaan yang sering diajukan." },
        ],
      },
    ],
  },
];

function NavigationGroupItems({ group, mobile = false }: { group: NavigationGroup; mobile?: boolean }) {
  return (
    <div className={mobile ? "portal-mobile-submenu" : `portal-nav-dropdown-grid is-${group.variant}`}>
      {group.sections.map((section, sectionIndex) => (
        <div key={section.label || sectionIndex} className="portal-nav-section">
          {section.label ? <p className="portal-nav-section-title">{section.label}</p> : null}
          <div className="grid gap-0.5">
            {section.items.map((item) => item.href ? (
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
        </div>
      ))}
    </div>
  );
}

function Brand({ inverted = false, configuration }: { inverted?: boolean; configuration: PublicPlatformConfiguration }) {
  const configuredLogo = configuration.identity.logo_media_id ? `/api/v1/media/${encodeURIComponent(configuration.identity.logo_media_id)}/content` : "";
  return (
    <Link href="/" className="logo group flex shrink-0 items-center gap-2.5" aria-label="Teman Belajar — Beranda">
      {configuredLogo ? (
        <img src={configuredLogo} alt="" className="h-10 w-10 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-3 drop-shadow-sm" />
      ) : (
        <div className="relative flex items-center justify-center rounded-xl p-0.5 transition-transform duration-300 group-hover:-rotate-3">
          <BrandLogo className="h-9 w-9 shrink-0 object-contain drop-shadow-sm" priority={!inverted} />
        </div>
      )}
      <span className={`text-lg font-extrabold tracking-tight leading-none transition-colors ${inverted ? "!text-white" : "text-slate-900 dark:text-white"}`}>
        Teman Belajar
      </span>
    </Link>
  );
}

export function PortalChrome({ authenticated, configuration, children }: { authenticated: boolean; configuration: PublicPlatformConfiguration; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { menuOpen, navSticky, showBackToTop, toggleMenu, scrollToTop } = useTechwindRuntime(`${pathname}?${searchParams}`);
  const featureForHref = (href: string) => { const key = href.startsWith("/training-programs") ? "training_programs" : href.startsWith("/microlearning") ? "microlearning" : href.startsWith("/learning-paths") ? "learning_paths" : href.startsWith("/media-gallery") ? "media_gallery" : href.startsWith("/knowledge") ? "knowledge" : href.startsWith("/news") ? "news" : href.startsWith("/announcements") ? "announcements" : href.startsWith("/help") ? "faq" : href.startsWith("/search") ? "search" : ""; return configuration.features.find((feature) => feature.key === key); };
  const effectiveNavigationGroups = navigationGroups.map((group) => ({
    ...group,
    sections: group.sections.map((section) => ({
      ...section,
      items: section.items.flatMap((item) => {
        if (!item.href) return [item];
        const configured = configuration.navigation.find((candidate) => candidate.href === item.href);
        const feature = featureForHref(item.href);
        if (configured?.visible === false || feature?.visible === false) return [];
        return [{ ...item, label: configured?.label || feature?.label || item.label, description: configured?.description || item.description }];
      }),
    })).filter((section) => section.items.length > 0),
  })).filter((group) => group.sections.length > 0);

  const active = (href: string) => {
    const basePath = href.split(/[?#]/)[0];
    return basePath === "/" ? pathname === "/" : pathname.startsWith(basePath);
  };

  const isGroupActive = (group: NavigationGroup) => group.sections.flatMap((section) => section.items).some(item => {
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

  const isTransparent = pathname === "/" && !navSticky && !menuOpen;

  if (pathname.startsWith("/sso/")) return <main>{children}</main>;

  return (
    <>
      <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten utama</a>
      {!authenticated ? <SilentSsoBridge /> : null}
      <header
        id="topnav"
        className={`techwind-topnav defaultscroll top-0 z-50 transition-all duration-300 ${
          pathname === "/" ? "fixed inset-x-0" : "sticky"
        } ${
          isTransparent
            ? "is-transparent bg-transparent border-transparent shadow-none"
            : "portal-header border-b backdrop-blur-md shadow-sm bg-white/95 dark:bg-[#090e17]/95 border-slate-200/80 dark:border-slate-800/80"
        } ${navSticky ? "nav-sticky" : ""}`}
      >
        <div className="portal-container flex h-[74px] items-center justify-between gap-4">
          <div className="flex flex-1 items-center justify-start">
            <Brand inverted={isTransparent} configuration={configuration} />
          </div>
          <nav id="navigation" className="navigation-menu hidden items-center justify-center gap-1 lg:flex" aria-label="Navigasi utama">
            <Link href="/" aria-current={active("/") ? "page" : undefined} className={`portal-nav-link ${active("/") ? "is-active" : ""}`}><span>Beranda</span></Link>
            {effectiveNavigationGroups.map((group) => (
              <details key={group.label} className="portal-nav-group">
                <summary className={`portal-nav-link ${isGroupActive(group) ? "is-active" : ""}`}>
                  <span>{group.label}</span><PortalIcon name="chevron-down" className="h-4 w-4" />
                </summary>
                <div className={`portal-nav-dropdown is-${group.variant} is-${group.label.toLowerCase()}`}><NavigationGroupItems group={group} /></div>
              </details>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-2 lg:ml-4">
            <ThemeToggle />
            {authenticated ? <PortalNotificationCenter /> : null}
            {authenticated ? (
              <Link href="/api/auth/federated-logout" prefetch={false} className="portal-button-secondary hidden sm:inline-flex">Keluar</Link>
            ) : (
              <Link href="/api/auth/signin?callbackUrl=/" className="portal-header-action hidden sm:inline-flex" aria-label="Masuk ke akun" title="Masuk ke akun"><PortalIcon name="user" className="h-5 w-5" /></Link>
            )}
            <button id="isToggle" type="button" className={`navbar-toggle portal-menu-button grid h-11 w-11 place-items-center rounded-full border lg:hidden ${menuOpen ? "open" : ""}`} aria-label={menuOpen ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={menuOpen} aria-controls="portal-mobile-navigation" onClick={toggleMenu}>
              <PortalIcon name={menuOpen ? "close" : "menu"} className="h-6 w-6" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div id="portal-mobile-navigation" className="portal-mobile-menu border-t lg:hidden">
            <div className="portal-container py-4">
              <form action="/search" method="GET" role="search" className="relative mb-3">
                <SearchField id="portal-mobile-search" name="q" label="Cari di Teman Belajar" placeholder="Cari konten dan kelas" compact showLabel={false} inputClassName="!pl-10" />
              </form>
              <nav className="grid gap-1 sm:grid-cols-2" aria-label="Navigasi seluler">
                <Link href="/" aria-current={active("/") ? "page" : undefined} className={`portal-mobile-link ${active("/") ? "is-active" : ""}`}><span>Beranda</span></Link>
                {effectiveNavigationGroups.map((group) => (
                  <details key={group.label} className="portal-mobile-group sm:col-span-2">
                    <summary className={`portal-mobile-link ${isGroupActive(group) ? "is-active" : ""}`}><span>{group.label}</span><PortalIcon name="chevron-down" className="h-4 w-4" /></summary>
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
        <div className="portal-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.35fr_repeat(3,.8fr)]">
          <div><Brand inverted configuration={configuration} /><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">{configuration.footer.summary}</p></div>
          {effectiveNavigationGroups.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-bold text-white">{group.label}</h2>
              <div className="mt-4 grid gap-3 text-sm">
                {group.sections.flatMap((section) => section.items).map((item) => item.href ? (
                  <Link key={item.label} href={item.href} className="text-slate-300 hover:text-white transition-colors duration-200">{item.label}</Link>
                ) : (
                  <span key={item.label} className="inline-flex items-center gap-2 text-slate-400" aria-disabled="true">{item.label}<span className="portal-coming-soon">Segera</span></span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10"><div className="portal-container flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Teman Belajar.</span><span>Platform Pengalaman Belajar Digital Perusahaan</span></div></div>
      </footer>
      <button type="button" id="back-to-top" className={`techwind-back-to-top portal-back-to-top ${showBackToTop ? "is-visible" : ""}`} onClick={scrollToTop} aria-label="Kembali ke atas">
        <PortalIcon name="arrow-up" className="h-5 w-5" />
      </button>
    </>
  );
}

