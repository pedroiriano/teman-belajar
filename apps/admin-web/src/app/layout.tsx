import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { AdminShell } from "@/components/admin-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "@/styles/cuba-foundation.css";
import "./globals.css";

const cubaFont = Rubik({ subsets: ["latin"], display: "swap", variable: "--font-cuba-rubik" });
export const metadata: Metadata = {
  metadataBase: new URL(process.env.ADMIN_PUBLIC_BASE_URL || "http://localhost:3001"),
  applicationName: "Admin Teman Belajar",
  title: { default: "Admin Teman Belajar", template: "%s | Admin Teman Belajar" },
  description: "Panel administrasi Teman Belajar untuk pengelolaan konten dan alur kerja editorial.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicon.png", type: "image/png", sizes: "64x64" }],
    shortcut: "/brand/favicon.png",
    apple: [{ url: "/brand/app-icon.png", type: "image/png", sizes: "512x512" }],
  },
};

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session: any = await getServerSession(authOptions);
  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body data-ui-foundation="cuba" className={`${cubaFont.variable} font-rubik cuba-foundation admin-root min-h-screen antialiased`}>
        <AnalyticsTracker />
        <a href="#admin-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Lewati ke konten</a>
        {session ? <AdminShell userName={session.user?.name} userEmail={session.user?.email} role={session.roles?.includes("Portal Administrator") ? "Portal Administrator" : session.roles?.includes("Reviewer") ? "Reviewer" : "Content Editor"} roles={session.roles}>{children}</AdminShell> : (
          <>
            <div className="fixed right-4 top-4 z-50"><ThemeToggle /></div>
            <main id="admin-content">{children}</main>
          </>
        )}
      </body>
    </html>
  );
}
