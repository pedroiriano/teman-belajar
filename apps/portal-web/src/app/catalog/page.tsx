import type { Metadata } from "next";

import { PageHero } from "@/components/techwind";
import { CatalogExplorer, type CatalogItem } from "@/components/catalog/catalog-explorer";
import { listTrainingProgramsWithReviews } from "@/lib/training-programs";
import { listMicrolearning } from "@/lib/microlearning";
import { listWebinars } from "@/lib/webinars";
import { listLearningPaths } from "@/lib/learning-paths";

export const metadata: Metadata = {
  title: "Katalog Pembelajaran Terpadu",
  description: "Jelajahi seluruh program pelatihan, microlearning, webinar, dan jalur belajar di Teman Belajar.",
  alternates: { canonical: "/catalog" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    format?: string;
    category?: string;
    tag?: string;
    level?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const raw = await searchParams;

  // Fetch all content formats concurrently with resilience
  const [programsRes, microRes, webinarsRes, pathsRes] = await Promise.all([
    listTrainingProgramsWithReviews("", 1).catch(() => ({ data: [] })),
    listMicrolearning("", "", 1).catch(() => ({ data: [] })),
    listWebinars(1).catch(() => ({ data: { data: [] } })),
    listLearningPaths("", 1).catch(() => ({ data: [] })),
  ]);

  const items: CatalogItem[] = [];

  // 1. Training Programs
  if (Array.isArray(programsRes.data)) {
    for (const prog of programsRes.data) {
      items.push({
        id: `prog-${prog.id}`,
        title: prog.title,
        summary: prog.summary || prog.description || "Program pelatihan terstruktur untuk meningkatkan keahlian kerja.",
        format: "program",
        formatLabel: "Program Pelatihan",
        badge: "Pelatihan Formal",
        badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        href: `/training-programs/${prog.slug}`,
        image: prog.visual?.image || "/techwind-hero/course/c1.jpg",
        duration: prog.visual?.durationLabel || "Multi-Minggu",
        actionLabel: "Pelajari Program",
        level: prog.visual?.level === "Pemula" ? "beginner" : prog.visual?.level === "Mahir" ? "advanced" : "intermediate",
        levelLabel: prog.visual?.level || "Menengah",
        category: prog.visual?.category || "pelatihan",
        tags: ["program", "sertifikasi", "keahlian", ...(prog.visual?.category ? [prog.visual.category.toLowerCase()] : [])],
        rating: prog.rating,
        instructor: prog.visual?.instructor,
      });
    }
  }

  // 2. Microlearning
  if (Array.isArray(microRes.data)) {
    const microImages: Record<string, string> = {
      "panduan-ringkas-docker-compose": "/techwind-hero/course/c7.jpg",
      "prinsip-keamanan-rest-api": "/techwind-hero/course/c8.jpg",
      "pola-state-management-react": "/techwind-hero/course/c9.jpg",
    };
    for (const micro of microRes.data) {
      items.push({
        id: `micro-${micro.id}`,
        title: micro.title,
        summary: micro.summary || "Materi pembelajaran ringkas dan praktis untuk penerapan langsung.",
        format: "microlearning",
        formatLabel: "Pembelajaran Mikro",
        badge: "Ringkas",
        badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        href: `/microlearning/${micro.slug}`,
        image: microImages[micro.slug] || "/techwind-hero/course/c2.jpg",
        duration: micro.duration_minutes ? `${micro.duration_minutes} menit` : "5 menit",
        actionLabel: "Mulai Membaca",
        level: "beginner",
        levelLabel: "Pemula",
        category: "praktis",
        tags: ["microlearning", "ringkas", "mandiri"],
      });
    }
  }

  // 3. Webinars
  const webinarSessions = webinarsRes.data?.data;
  if (Array.isArray(webinarSessions)) {
    for (const web of webinarSessions) {
      items.push({
        id: `webinar-${web.id}`,
        title: web.title,
        summary: web.summary || "Sesi pembelajaran langsung interaktif bersama para pakar dan praktisi.",
        format: "webinar",
        formatLabel: "Webinar",
        badge: web.status === "live" ? "Sedang Berlangsung" : "Sesi Langsung",
        badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        href: `/webinars/${web.id}`,
        image: "/techwind-hero/course/c3.jpg",
        duration: "1-2 jam",
        actionLabel: "Daftar Sesi",
        level: "intermediate",
        levelLabel: "Menengah",
        category: "webinar",
        tags: ["webinar", "interaktif", "pakar"],
      });
    }
  }

  // 4. Learning Paths
  if (Array.isArray(pathsRes.data)) {
    for (const path of pathsRes.data) {
      items.push({
        id: `path-${path.id}`,
        title: path.version?.title || path.slug,
        summary: path.version?.summary || "Rangkaian kurikulum bertahap untuk penguasaan kompetensi menyeluruh.",
        format: "path",
        formatLabel: "Jalur Belajar",
        badge: "Jalur Terarah",
        badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        href: `/learning-paths/${path.slug}`,
        image: "/techwind-hero/course/c10.jpg",
        duration: `${path.version?.items?.length || 3} langkah`,
        actionLabel: "Jelajahi Jalur",
        level: "advanced",
        levelLabel: "Mahir",
        category: "kurikulum",
        tags: ["jalur-belajar", "roadmap", "kompetensi"],
      });
    }
  }

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <PageHero
        eyebrow="Katalog Pembelajaran Terpadu"
        title="Jelajahi Seluruh Program & Materi"
        description="Temukan ragam pelatihan penuh, pembelajaran mikro, webinar langsung, dan jalur belajar terarah untuk akselerasi kompetensi Anda."
        icon="book"
        tone="teal"
      />

      <div className="portal-container mt-10">
        <CatalogExplorer
          initialItems={items}
          initialFormat={raw.format || ""}
          initialCategory={raw.category || ""}
          initialTag={raw.tag || ""}
          initialLevel={raw.level || ""}
          initialQuery={raw.q || ""}
          initialSort={raw.sort || "latest"}
        />
      </div>
    </div>
  );
}
