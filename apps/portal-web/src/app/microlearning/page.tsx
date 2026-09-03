import type { Metadata } from "next";
import Link from "next/link";

import {
  EmptyState,
  ErrorState,
  FilterBar,
  FullScreenHero,
  MicrolearningCard,
  Pagination,
  SearchField,
  TabFilters,
} from "@/components/techwind";
import {
  listMicrolearning,
  type MicrolearningFormat,
} from "@/lib/microlearning";

export const metadata: Metadata = {
  title: "Pembelajaran Singkat",
  description:
    "Materi editorial terkurasi selama 3–15 menit di Teman Belajar.",
  alternates: { canonical: "/microlearning" },
};

const formatFilterOptions = [
  { value: "", label: "Semua Format" },
  { value: "quick", label: "Quick Learning" },
  { value: "article", label: "Artikel" },
  { value: "video", label: "Video" },
];

const labels: Record<MicrolearningFormat, string> = {
  article: "Artikel",
  video: "Video",
  quick: "Quick learning",
};

function href(query: string, format: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (format) params.set("format", format);
  if (page > 1) params.set("page", String(page));
  return `/microlearning${params.size ? `?${params}` : ""}`;
}

export default async function MicrolearningPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().slice(0, 100);
  const format = ["article", "video", "quick"].includes(raw.format || "")
    ? raw.format || ""
    : "";
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listMicrolearning(query, format, page);

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Pembelajaran Singkat" },
  ];

  return (
    <div>
      <FullScreenHero
        title="Pembelajaran Singkat"
        description="Akses materi ringkas, video tutorial, dan rangkuman praktis yang dapat dipelajari secara fleksibel kapan saja."
        backgroundImage="/techwind-hero/blog.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      >
        <Link
          href="#catalog"
          className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md"
        >
          Lihat Pembelajaran Singkat
        </Link>
      </FullScreenHero>

      <section id="catalog" className="portal-container py-10 sm:py-14">
        <FilterBar
          role="search"
          action="/microlearning"
          method="GET"
          className="mb-6 flex flex-col gap-3 p-4 sm:flex-row"
        >
          <SearchField
            id="microlearning-search"
            name="q"
            label="Cari materi"
            placeholder="Cari topik atau judul materi"
            maxLength={100}
            defaultValue={query}
            required={false}
            inputClassName="min-h-11 !rounded-xl !pl-12"
            className="flex-1"
          />
          {format ? <input type="hidden" name="format" value={format} /> : null}
          <button type="submit" className="portal-button-primary min-h-11">
            Cari materi
          </button>
          {query || format ? (
            <Link
              href="/microlearning"
              className="portal-button-secondary min-h-11"
            >
              Hapus filter
            </Link>
          ) : null}
        </FilterBar>

        {/* Tab Filters for Format */}
        <div className="mb-8">
          <TabFilters options={formatFilterOptions} paramName="format" basePath="/microlearning" />
        </div>

        {result.error ? (
          <div className="mt-8">
            <ErrorState title="Pembelajaran Singkat belum dapat dimuat" />
          </div>
        ) : result.data.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={
                query || format
                  ? "Materi tidak ditemukan"
                  : "Belum ada materi terbit"
              }
              description={
                query || format
                  ? "Coba gunakan kata kunci atau filter format lain."
                  : "Materi yang telah ditinjau dan diterbitkan akan tampil di sini."
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="portal-eyebrow">Katalog Editorial</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {query ? `Hasil untuk “${query}”` : "Materi siap dipelajari"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Menampilkan {result.data.length} dari {result.pagination.total} materi pembelajaran singkat tersedia
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {result.data.map((item) => (
                <MicrolearningCard
                  key={item.id}
                  href={`/microlearning/${item.slug}`}
                  title={item.title}
                  summary={item.summary}
                  formatLabel={labels[item.format]}
                  durationMinutes={item.duration_minutes}
                  featuredMediaId={item.featured_media_id}
                />
              ))}
            </div>

            <Pagination
              pagination={result.pagination}
              path="/microlearning"
              getHref={(nextPage) => href(query, format, nextPage)}
            />
          </>
        )}
      </section>
    </div>
  );
}
