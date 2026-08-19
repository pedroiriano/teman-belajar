import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { PortalChrome } from "@/components/portal-chrome";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Teman Belajar", template: "%s | Teman Belajar" },
  description: "Enterprise Digital Learning Experience Platform untuk belajar, berbagi pengetahuan, dan bertumbuh bersama.",
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
      root.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className={`${inter.className} portal-root min-h-screen antialiased`}>
        <AnalyticsTracker />
        <PortalChrome authenticated={Boolean(session)}>{children}</PortalChrome>
      </body>
    </html>
  );
}



