import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";
import type { TaxonomyTerm } from "@/lib/discovery/types";

export const metadata: Metadata = {
  title: "Kategori Teman Belajar",
  description: "Daftar kategori materi pembelajaran terpadu di Teman Belajar.",
  alternates: { canonical: "/categories" },
};

type TermWithUsage = TaxonomyTerm & { usage_count?: number };

async function getCategories(): Promise<TermWithUsage[]> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/api/v1/discovery/categories`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function CategoriesIndexPage() {
  const categories = await getCategories();

  return (
    <div>
      <PageHero
        eyebrow="Kategori Teman Belajar"
        title="Jelajahi Berdasarkan Kategori"
        description="Temukan materi pengetahuan, warta, dan modul pelatihan yang dikelompokkan berdasarkan topik kebutuhan pembelajaran Anda."
      />

      <section className="portal-container py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 flex gap-2 text-sm text-slate-500">
          <Link href="/" className="font-bold text-teal-700 hover:underline">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-slate-700 dark:text-slate-200">
            Kategori
          </span>
        </nav>

        {categories.length === 0 ? (
          <EmptyState
            title="Belum ada kategori aktif"
            description="Kategori pembelajaran akan segera hadir setelah materi terkait dipublikasikan."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id || cat.slug}
                href={`/categories/${cat.slug}`}
                className="portal-card group flex flex-col p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-teal-500"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <PortalIcon name="book" className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {cat.usage_count ? `${cat.usage_count} Konten` : "Kategori"}
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-extrabold text-slate-900 group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-400 transition-colors">
                  {cat.name}
                </h2>

                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {cat.description || "Jelajahi seluruh materi pembelajaran dan warta dalam kategori ini."}
                </p>

                <div className="mt-auto pt-6 flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                  <span>Lihat semua materi</span>
                  <PortalIcon name="chevron-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
