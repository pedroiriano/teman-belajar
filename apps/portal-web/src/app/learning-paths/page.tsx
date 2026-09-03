import type { Metadata } from "next";
import Link from "next/link";

import {
  EmptyState,
  ErrorState,
  FilterBar,
  FullScreenHero,
  LearningPathCard,
  Pagination,
  SearchField,
  TabFilters,
} from "@/components/techwind";
import { listLearningPaths } from "@/lib/learning-paths";

export const metadata: Metadata = {
  title: "Jalur Belajar",
  description: "Ikuti jalur belajar bertahap di Teman Belajar.",
  alternates: { canonical: "/learning-paths" },
};

const pathFilterOptions = [
  { value: "", label: "Semua Jalur" },
  { value: "comprehensive", label: "Kurikulum Komprehensif (3+ Materi)" },
  { value: "focused", label: "Jalur Terfokus (1–2 Materi)" },
];

function href(query: string, filter: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filter) params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  return `/learning-paths${params.size ? `?${params}` : ""}`;
}

export default async function LearningPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().slice(0, 100);
  const filter = (raw.filter || "").trim();
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listLearningPaths(query, page);

  const filteredPaths = result.data.filter((path) => {
    if (!filter) return true;
    if (filter === "comprehensive") return path.version.items.length >= 3;
    if (filter === "focused") return path.version.items.length < 3;
    return true;
  });

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Jalur Belajar" },
  ];

  return (
    <div>
      <FullScreenHero
        title="Jalur Belajar"
        description="Ikuti rangkaian pembelajaran bertahap untuk membangun kompetensi yang terarah, menyeluruh, dan relevan dengan peran Anda."
        backgroundImage="/techwind-hero/course/cta.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      >
        <Link
          href="#catalog"
          className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md"
        >
          Jelajahi Jalur Belajar
        </Link>
      </FullScreenHero>

      <section id="catalog" className="portal-container py-10 sm:py-14">
        <FilterBar
          role="search"
          action="/learning-paths"
          method="GET"
          className="mb-6 flex flex-col gap-3 p-4 sm:flex-row"
        >
          <SearchField
            id="path-search"
            name="q"
            label="Cari Jalur Belajar"
            placeholder="Cari jalur berdasarkan tujuan belajar atau topik"
            maxLength={100}
            defaultValue={query}
            required={false}
            showLabel={false}
            className="flex-1"
            inputClassName="min-h-11 !rounded-xl !pl-12"
          />
          <button type="submit" className="portal-button-primary min-h-11">
            Cari jalur
          </button>
          {query || filter ? (
            <Link
              href="/learning-paths"
              className="portal-button-secondary min-h-11"
            >
              Hapus filter
            </Link>
          ) : null}
        </FilterBar>

        {/* Tab Filters */}
        <div className="mb-8">
          <TabFilters options={pathFilterOptions} paramName="filter" basePath="/learning-paths" />
        </div>

        {result.error ? (
          <ErrorState title="Jalur Belajar belum dapat dimuat" />
        ) : filteredPaths.length === 0 ? (
          <EmptyState
            title={query || filter ? "Jalur tidak ditemukan" : "Belum ada jalur terbit"}
            description={
              query || filter
                ? "Coba gunakan kata kunci atau pilihan filter lain."
                : "Jalur yang telah ditinjau dan diterbitkan akan tampil di sini."
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="portal-eyebrow">Katalog Terarah</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {query ? `Hasil untuk “${query}”` : "Pilih jalur sesuai tujuan"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Menampilkan {filteredPaths.length} dari {result.pagination.total} jalur belajar terstruktur tersedia
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredPaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  href={`/learning-paths/${path.slug}`}
                  title={path.version.title}
                  summary={path.version.summary}
                  version={path.version.number}
                  itemCount={path.version.items.length}
                  publishedAt={path.version.published_at}
                />
              ))}
            </div>

            <Pagination
              pagination={result.pagination}
              path="/learning-paths"
              getHref={(nextPage) => href(query, filter, nextPage)}
            />
          </>
        )}
      </section>
    </div>
  );
}
