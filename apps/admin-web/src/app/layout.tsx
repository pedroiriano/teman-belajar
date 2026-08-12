import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { title: { default: "Admin Teman Belajar", template: "%s | Admin Teman Belajar" }, description: "Backoffice Teman Belajar untuk pengelolaan konten dan workflow editorial." };

const items = [
  { href: "/dashboard", label: "Ringkasan", icon: "M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" },
  { href: "/dashboard/news", label: "Berita", icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" },
  { href: "/dashboard/announcements", label: "Pengumuman", icon: "M5 13V9l12-5v14L5 13Zm0 0 2 7h4l-2-6" },
  { href: "/dashboard/knowledge", label: "Pusat Pengetahuan", icon: "M5 4h14v16H5zM9 4v16M12 8h4M12 12h4" },
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
      root.classList.toggle("dark-only", theme === "dark");
      root.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

function SidebarContent() {
  return <><div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 font-black text-white">TB</span><div><span className="block font-extrabold text-white">Teman Belajar</span><span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Admin Console</span></div></div><nav className="p-4" aria-label="Navigasi admin"><p className="px-3 pb-2 pt-3 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Workspace</p>{items.map((item) => <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={item.icon}/></svg>{item.label}</Link>)}</nav></>;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session: any = await getServerSession(authOptions);
  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className={`${inter.className} admin-root min-h-screen antialiased`}>
        <a href="#admin-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten</a>
        {session ? (
          <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
            <aside className="admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block"><SidebarContent /></aside>
            <div className="min-w-0 lg:col-start-2">
              <header className="admin-topbar sticky top-0 z-30 flex h-[72px] items-center justify-between border-b px-4 backdrop-blur sm:px-7">
                <details className="relative lg:hidden">
                  <summary className="admin-menu-button grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border" aria-label="Buka navigasi"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
                  <aside className="admin-sidebar absolute -left-4 top-14 w-72 rounded-br-2xl pb-4 shadow-2xl"><SidebarContent /></aside>
                </details>
                <div className="hidden lg:block"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Backoffice</p><p className="text-sm font-extrabold text-slate-800">Kelola pengalaman Teman Belajar</p></div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />
                  <span className="hidden text-right md:block"><span className="block text-sm font-bold text-slate-800">{session.user?.name || session.user?.email}</span><span className="block text-xs text-slate-500">{session.roles?.includes("Portal Administrator") ? "Portal Administrator" : session.roles?.includes("Reviewer") ? "Reviewer" : "Content Editor"}</span></span>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-100 text-sm font-black text-orange-700">{(session.user?.name || session.user?.email || "TB").slice(0, 2).toUpperCase()}</span>
                  <Link href="/api/auth/signout" className="admin-button-secondary hidden sm:inline-flex">Keluar</Link>
                </div>
              </header>
              <main id="admin-content" className="p-4 sm:p-7 lg:p-8">{children}</main>
            </div>
          </div>
        ) : (
          <>
            <div className="fixed right-4 top-4 z-50"><ThemeToggle /></div>
            <main id="admin-content">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}
