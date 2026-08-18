import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Teman Belajar", template: "%s | Teman Belajar" },
  description: "Enterprise Digital Learning Experience Platform untuk belajar, berbagi pengetahuan, dan bertumbuh bersama.",
};

const navItems = [
  { href: "/", label: "Beranda" },
  { href: "/knowledge", label: "Pusat Pengetahuan" },
  { href: "/news", label: "Berita" },
  { href: "/announcements", label: "Pengumuman" },
];

const themeInitializationScript = `
  (() => {
    try {
      const stored = localStorage.getItem("teman-belajar-theme");
      const theme = stored === "light" || stored === "dark"
        ? stored
        : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const root = document.documentElement;
      root.dataset.theme = theme;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Teman Belajar — Beranda">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/15 transition group-hover:-rotate-3">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4.5c2.8 2 7.2 2 10 0V12"/><path d="M21 9v6"/></svg>
      </span>
      <span><span className={`block text-lg font-extrabold leading-5 ${inverted ? "text-white" : "text-slate-900"}`}>Teman Belajar</span><span className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${inverted ? "text-teal-300" : "text-teal-700"}`}>Learning Experience</span></span>
    </Link>
  );
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className={`${inter.className} portal-root min-h-screen antialiased`}>
        <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten utama</a>
        <header className="portal-header sticky top-0 z-50 border-b backdrop-blur">
          <div className="portal-container flex h-[72px] items-center justify-between gap-5">
            <Brand />
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
              {navItems.map((item) => <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-teal-700">{item.label}</Link>)}
            </nav>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <form action="/search" method="GET" className="hidden sm:block relative mr-2">
                <input 
                  type="search" 
                  name="q" 
                  placeholder="Cari kelas, berita..." 
                  className="w-48 xl:w-64 rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-teal-500"
                  aria-label="Cari"
                />
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </form>
              <ThemeToggle />
              <div className="hidden items-center gap-3 sm:flex">
                {session ? (
                  <>
                    <Link href="/my-learning" className="text-sm font-bold text-slate-700 hover:text-teal-700">Pembelajaran Saya</Link>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href="/api/auth/federated-logout" className="portal-button-secondary">Keluar</a>
                  </>
                ) : (
                  <Link href="/api/auth/signin" className="portal-button-primary">Masuk ke akun</Link>
                )}
              </div>
              <details className="relative lg:hidden">
                <summary className="portal-menu-button grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border" aria-label="Buka navigasi"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
                <div className="portal-mobile-menu absolute right-0 top-14 w-72 rounded-2xl border p-3 shadow-2xl">
                  <nav className="grid" aria-label="Navigasi seluler">{navItems.map((item) => <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800">{item.label}</Link>)}</nav>
                  <form action="/search" method="GET" className="mt-2 px-2">
                    <div className="relative">
                      <input 
                        type="search" 
                        name="q" 
                        placeholder="Cari..." 
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-slate-800 dark:bg-slate-900"
                        aria-label="Cari"
                      />
                      <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                  </form>
                  <div className="mt-2 border-t border-slate-100 pt-3">
                    {session ? (
                      <div className="grid gap-2">
                        <Link href="/my-learning" className="portal-button-secondary">Pembelajaran Saya</Link>
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a href="/api/auth/federated-logout" className="portal-button-primary">Keluar</a>
                      </div>
                    ) : (
                      <Link href="/api/auth/signin" className="portal-button-primary w-full">Masuk ke akun</Link>
                    )}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="portal-footer border-t border-slate-800 bg-[#102a43] text-slate-300">
          <div className="portal-container grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div><Brand inverted /><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Ruang belajar terpadu untuk menemukan wawasan, mengikuti pembelajaran formal, dan bertumbuh bersama organisasi.</p></div>
            <div><h2 className="text-sm font-bold text-white">Jelajahi</h2><div className="mt-4 grid gap-2 text-sm">{navItems.slice(1).map((item) => <Link key={item.href} href={item.href} className="hover:text-white">{item.label}</Link>)}</div></div>
            <div><h2 className="text-sm font-bold text-white">Platform</h2><p className="mt-4 text-sm leading-6 text-slate-400">Composable LXP + Moodle LMS dengan identitas terpusat dan pengalaman yang aman.</p></div>
          </div>
          <div className="border-t border-white/10"><div className="portal-container py-5 text-xs text-slate-500">© {new Date().getFullYear()} Teman Belajar. Enterprise Digital Learning Experience Platform.</div></div>
        </footer>
      </body>
    </html>
  );
}
