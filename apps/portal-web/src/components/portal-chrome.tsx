"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { PortalIcon } from "@/components/portal-icon";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryNavigation = [
  { href: "/", label: "Beranda" },
  { href: "/my-learning", label: "Belajar" },
  { href: "/knowledge", label: "Pengetahuan" },
  { href: "/news", label: "Berita" },
  { href: "/announcements", label: "Pengumuman" },
];

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Teman Belajar — Beranda">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/15 transition group-hover:-rotate-3">
        <PortalIcon name="graduation" className="h-6 w-6" />
      </span>
      <span>
        <span className={`block text-lg font-extrabold leading-5 ${inverted ? "text-white" : "text-slate-900"}`}>Teman Belajar</span>
        <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${inverted ? "text-teal-300" : "text-teal-700"}`}>Learning Experience</span>
      </span>
    </Link>
  );
}

export function PortalChrome({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMenuOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten utama</a>
      <header className="portal-header sticky top-0 z-50 border-b backdrop-blur">
        <div className="portal-container flex h-[76px] items-center gap-4">
          <Brand />
          <nav className="ml-auto hidden items-center gap-1 xl:flex" aria-label="Navigasi utama">
            {primaryNavigation.map((item) => (
              <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`portal-nav-link ${active(item.href) ? "is-active" : ""}`}>{item.label}</Link>
            ))}
            <Link href="/#media" className="portal-nav-link">Media</Link>
            <Link href="/#faq" className="portal-nav-link">FAQ</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 xl:ml-4">
            <form action="/search" method="GET" role="search" className="relative hidden 2xl:block">
              <label htmlFor="portal-search" className="sr-only">Cari di Teman Belajar</label>
              <PortalIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="portal-search" type="search" name="q" required maxLength={200} placeholder="Cari konten dan kelas" className="portal-search-input w-56" />
            </form>
            <ThemeToggle />
            {authenticated ? (
              <Link href="/api/auth/federated-logout" prefetch={false} className="portal-button-secondary hidden sm:inline-flex">Keluar</Link>
            ) : (
              <Link href="/api/auth/signin" className="portal-button-primary hidden sm:inline-flex">Masuk</Link>
            )}
            <button type="button" className="portal-menu-button grid h-11 w-11 place-items-center rounded-xl border xl:hidden" aria-label={menuOpen ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={menuOpen} aria-controls="portal-mobile-navigation" onClick={() => setMenuOpen((value) => !value)}>
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
                {[...primaryNavigation, { href: "/#media", label: "Media" }, { href: "/#faq", label: "FAQ" }].map((item) => (
                  <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`portal-mobile-link ${active(item.href) ? "is-active" : ""}`}>{item.label}</Link>
                ))}
              </nav>
              <div className="mt-4 border-t border-slate-100 pt-4">
                {authenticated ? <Link href="/api/auth/federated-logout" prefetch={false} className="portal-button-primary w-full">Keluar</Link> : <Link href="/api/auth/signin" className="portal-button-primary w-full">Masuk ke akun</Link>}
              </div>
            </div>
          </div>
        )}
      </header>
      <main id="main-content">{children}</main>
      <footer className="portal-footer border-t border-slate-800 bg-[#102a43] text-slate-300">
        <div className="portal-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr]">
          <div><Brand inverted /><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Ruang belajar terpadu untuk menemukan wawasan, mengikuti pembelajaran formal, dan bertumbuh bersama organisasi.</p></div>
          <div><h2 className="text-sm font-bold text-white">Jelajahi</h2><div className="mt-4 grid gap-3 text-sm"><Link href="/my-learning">Pembelajaran Saya</Link><Link href="/knowledge">Pusat Pengetahuan</Link><Link href="/search">Pencarian</Link></div></div>
          <div><h2 className="text-sm font-bold text-white">Informasi</h2><div className="mt-4 grid gap-3 text-sm"><Link href="/news">Berita</Link><Link href="/announcements">Pengumuman</Link><Link href="/#faq">FAQ</Link></div></div>
          <div><h2 className="text-sm font-bold text-white">Fondasi platform</h2><p className="mt-4 text-sm leading-7 text-slate-400">Composable LXP + Moodle LMS dengan identitas terpusat dan pengalaman yang aman.</p></div>
        </div>
        <div className="border-t border-white/10"><div className="portal-container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Teman Belajar.</span><span>Enterprise Digital Learning Experience Platform</span></div></div>
      </footer>
      <button type="button" className={`portal-back-to-top ${showBackToTop ? "is-visible" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Kembali ke atas">
        <PortalIcon name="arrow-up" className="h-5 w-5" />
      </button>
    </>
  );
}
