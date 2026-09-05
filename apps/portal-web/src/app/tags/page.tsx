import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";
import type { TaxonomyTerm } from "@/lib/discovery/types";

export const metadata: Metadata = {
  title: "Tag Teman Belajar",
  description: "Daftar label topik dan kata kunci materi pembelajaran di Teman Belajar.",
  alternates: { canonical: "/tags" },
};

type TermWithUsage = TaxonomyTerm & { usage_count?: number };

async function getTags(): Promise<TermWithUsage[]> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/api/v1/discovery/tags`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function TagsIndexPage() {
  const tags = await getTags();

  return (
    <div>
      <PageHero
        eyebrow="Tag Teman Belajar"
        title="Jelajahi Berdasarkan Tag"
        description="Temukan topik spesifik, materi keahlian teknis, dan kata kunci pembelajaran melalui label kurasi konten terbit."
      />

      <section className="portal-container py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 flex gap-2 text-sm text-slate-500">
          <Link href="/" className="font-bold text-teal-700 hover:underline">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-slate-700 dark:text-slate-200">
            Tag
          </span>
        </nav>

        {tags.length === 0 ? (
          <EmptyState
            title="Belum ada tag aktif"
            description="Tag pembelajaran akan tampil setelah materi terkait dipublikasikan oleh tim editorial."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tags.map((tag) => (
              <Link
                key={tag.id || tag.slug}
                href={`/tags/${tag.slug}`}
                className="portal-card group flex items-center justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-500"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <PortalIcon name="star" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-extrabold text-sm text-slate-900 group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400">
                      #{tag.name}
                    </h2>
                    <p className="text-[11px] text-slate-500 truncate">
                      {tag.usage_count ? `${tag.usage_count} materi` : "Tersedia"}
                    </p>
                  </div>
                </div>
                <PortalIcon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
