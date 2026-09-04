import type { Metadata } from "next";
import Link from "next/link";

import { PageHero, EmptyState } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";
import { listTrainingPrograms } from "@/lib/training-programs";
import { listMicrolearning } from "@/lib/microlearning";
import { listWebinars } from "@/lib/webinars";
import { listLearningPaths } from "@/lib/learning-paths";

export const metadata: Metadata = {
  title: "Katalog Pembelajaran Terpadu",
  description: "Jelajahi seluruh program pelatihan, microlearning, webinar, dan jalur belajar di Teman Belajar.",
  alternates: { canonical: "/catalog" },
};

type CatalogItem = {
  id: string;
  title: string;
  summary: string;
  format: "program" | "microlearning" | "webinar" | "path";
  formatLabel: string;
  badge: string;
  badgeClass: string;
  href: string;
  image: string;
  duration?: string;
  actionLabel: string;
};

const formatOptions = [
  { value: "", label: "Semua Format", icon: "book" as const },
  { value: "program", label: "Program Pelatihan", icon: "graduation" as const },
  { value: "microlearning", label: "Pembelajaran Mikro", icon: "play" as const },
  { value: "webinar", label: "Webinar", icon: "calendar" as const },
  { value: "path", label: "Jalur Belajar", icon: "star" as const },
];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().toLowerCase();
  const selectedFormat = (raw.format || "").trim();

  // Fetch all content formats concurrently with resilience
  const [programsRes, microRes, webinarsRes, pathsRes] = await Promise.all([
    listTrainingPrograms(query, 1).catch(() => ({ data: [] })),
    listMicrolearning(query, "", 1).catch(() => ({ data: [] })),
    listWebinars(1).catch(() => ({ data: { data: [] } })),
    listLearningPaths(query, 1).catch(() => ({ data: [] })),
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
        image: "/techwind-hero/course/c1.jpg",
        duration: "Multi-Minggu",
        actionLabel: "Pelajari Program",
      });
    }
  }

  // 2. Microlearning
  if (Array.isArray(microRes.data)) {
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
        image: "/techwind-hero/course/c2.jpg",
        duration: micro.duration_minutes ? `${micro.duration_minutes} menit` : "5 menit",
        actionLabel: "Mulai Membaca",
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
        image: "/techwind-hero/course/c4.jpg",
        duration: "Bertahap",
        actionLabel: "Jelajahi Jalur",
      });
    }
  }

  // Apply filters
  const filteredItems = items.filter((item) => {
    if (selectedFormat && item.format !== selectedFormat) {
      return false;
    }
    if (query) {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchSummary = item.summary.toLowerCase().includes(query);
      const matchFormat = item.formatLabel.toLowerCase().includes(query);
      return matchTitle || matchSummary || matchFormat;
    }
    return true;
  });

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
        {/* Filter & Search Toolbar */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm mb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <form method="GET" action="/catalog" className="w-full md:w-96 relative">
              <input type="hidden" name="format" value={selectedFormat} />
              <input
                type="text"
                name="q"
                defaultValue={raw.q || ""}
                placeholder="Cari pelatihan, topik, atau kata kunci..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-11 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              <PortalIcon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              />
            </form>

            {/* Total Results Counter */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Menampilkan <span className="text-teal-600 dark:text-teal-400 font-extrabold">{filteredItems.length}</span> materi pembelajaran
            </div>
          </div>

          {/* Format Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Format:</span>
            {formatOptions.map((opt) => {
              const isActive = selectedFormat === opt.value;
              const nextHref = `/catalog?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(opt.value ? { format: opt.value } : {}),
              }).toString()}`;

              return (
                <Link
                  key={opt.value}
                  href={nextHref}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                  }`}
                >
                  <PortalIcon name={opt.icon} className="h-3.5 w-3.5" />
                  <span>{opt.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Catalog Cards Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold border ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                      {item.duration && (
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <PortalIcon name="calendar" className="h-3 w-3" />
                          {item.duration}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                      <Link href={item.href}>{item.title}</Link>
                    </h3>

                    {/* Summary */}
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="p-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {item.formatLabel}
                  </span>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <PortalIcon name="chevron-right" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Materi Belum Ditemukan"
            description="Tidak ada program atau materi pembelajaran yang cocok dengan kata kunci atau format yang dipilih."
            actionHref="/catalog"
            actionLabel="Reset Pencarian"
          />
        )}
      </div>
    </div>
  );
}
