import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { PortalChrome } from "@/components/portal-chrome";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { StructuredData } from "@/components/structured-data";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: { default: "Teman Belajar", template: "%s | Teman Belajar" },
  description: "Platform pengalaman belajar digital perusahaan untuk belajar, berbagi pengetahuan, dan bertumbuh bersama.",
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
  const publicBase = new URL(process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000").toString();
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className={`${inter.className} portal-root min-h-screen antialiased`}>
        <StructuredData value={{ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": `${publicBase}#organization`, name: "Teman Belajar", url: publicBase }, { "@type": "WebSite", "@id": `${publicBase}#website`, name: "Teman Belajar", url: publicBase, publisher: { "@id": `${publicBase}#organization` } }] }} />
        <AnalyticsTracker />
        <PortalChrome authenticated={Boolean(session)}>{children}</PortalChrome>
      </body>
    </html>
  );
}



