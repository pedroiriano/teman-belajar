import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal-icon";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FullScreenHero,
  Pagination,
  SearchField,
  TabFilters,
} from "@/components/techwind";

export const metadata = {
  title: "Pencarian Teman Belajar",
  robots: { index: false, follow: true },
};

const contentTypes = [
  { value: "", label: "Semua Konten" },
  { value: "course", label: "Kelas Moodle" },
  { value: "microlearning", label: "Pembelajaran Singkat" },
  { value: "knowledge", label: "Pusat Pengetahuan" },
  { value: "news", label: "Berita" },
  { value: "announcement", label: "Pengumuman" },
  { value: "faq", label: "FAQ" },
] as const;

const domainConfig: Record<
  string,
  { label: string; icon: PortalIconName; action: string }
> = {
  course: { label: "Kelas", icon: "graduation", action: "Lihat kelas" },
  training: { label: "Pelatihan Penuh", icon: "graduation", action: "Lihat pelatihan" },
  microlearning: {
    label: "Pembelajaran Singkat",
    icon: "book",
    action: "Pelajari materi",
  },
  knowledge: { label: "Pengetahuan", icon: "book", action: "Baca artikel" },
  news: { label: "Berita", icon: "news", action: "Baca berita" },
  announcement: {
    label: "Pengumuman",
    icon: "bell",
    action: "Lihat pengumuman",
  },
  faq: { label: "FAQ", icon: "message", action: "Lihat jawaban" },
};

type SearchDocument = {
  id: string;
  content_type: string;
  title: string;
  snippet: string;
  url: string;
  category?: string;
  hierarchy_path?: string[];
  tags: string[];
  published_at?: string;
};

type SearchResponse = {
  data?: SearchDocument[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  error?: "invalid" | "unavailable";
};

type SearchParameters = {
  q?: string;
  content_type?: string;
  page?: string;
  sort?: string;
};

async function search(parameters: SearchParameters): Promise<SearchResponse> {
  const q = (parameters.q ?? "").trim();
  if (!q)
    return {
      data: [],
      pagination: { page: 1, page_size: 12, total: 0, total_pages: 0 },
    };
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { error: "unavailable" };

  const query = new URLSearchParams({
    q,
    page: parameters.page ?? "1",
    page_size: "12",
    sort: parameters.sort ?? "relevance",
  });
  if (parameters.content_type)
    query.set("content_type", parameters.content_type);
  try {
    const response = await fetch(`${apiBase}/api/v1/search?${query}`, {
      cache: "no-store",
    });
    if (response.status === 422) return { error: "invalid" };
    if (!response.ok) return { error: "unavailable" };
    return (await response.json()) as SearchResponse;
  } catch {
    return { error: "unavailable" };
  }
}

function searchHref(parameters: {
  q: string;
  contentType?: string;
  page?: number;
  sort?: string;
}) {
  const query = new URLSearchParams({ q: parameters.q });
  if (parameters.contentType) query.set("content_type", parameters.contentType);
  if (parameters.page && parameters.page > 1)
    query.set("page", String(parameters.page));
  if (parameters.sort && parameters.sort !== "relevance")
    query.set("sort", parameters.sort);
  return `/search?${query}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParameters>;
}) {
  const parameters = await searchParams;
  const q = (parameters.q ?? "").slice(0, 200);
  const contentType = parameters.content_type ?? "";
  const sort =
    parameters.sort === "newest" || parameters.sort === "oldest"
      ? parameters.sort
      : "relevance";
  const response = await search({
    ...parameters,
    q,
    content_type: contentType,
    sort,
  });
  const pagination = response.pagination;

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Pencarian" },
  ];

  return (
    <div>
      <FullScreenHero
        title={q ? `Hasil pencarian untuk “${q}”` : "Pencarian Terpadu"}
        description="Temukan materi kelas, modul pembelajaran singkat, artikel pengetahuan, berita, FAQ, dan pengumuman aktif dalam satu portal."
        backgroundImage="/techwind-hero/course/cta.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      />

      <section
        className="portal-container py-10 sm:py-14"
        aria-labelledby="search-results-heading"
      >
        <FilterBar
          action="/search"
          method="get"
          role="search"
          className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end"
        >
          <SearchField
            id="search-query"
            name="q"
            label="Kata kunci"
            defaultValue={q}
            placeholder="Contoh: keamanan informasi, analisis data"
          />
          <div>
            <label htmlFor="search-sort" className="portal-label">
              Urutkan
            </label>
            <select
              id="search-sort"
              name="sort"
              defaultValue={sort}
              className="portal-control mt-2 w-full"
            >
              <option value="relevance">Paling relevan</option>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
          {contentType ? (
            <input type="hidden" name="content_type" value={contentType} />
          ) : null}
          <button type="submit" className="portal-button-primary justify-center">
            Cari
          </button>
        </FilterBar>

        <div className="mt-7">
          <TabFilters
            options={contentTypes.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            paramName="content_type"
            basePath="/search"
            align="left"
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2
            id="search-results-heading"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {pagination && pagination.total > 0
              ? `Menampilkan ${response.data?.length || 0} dari ${pagination.total} hasil pencarian ditemukan`
              : q
              ? "0 hasil pencarian ditemukan"
              : "Hasil pencarian terpadu"}
          </h2>
          {q && (
            <p className="text-xs text-slate-400">
              Kata kunci: <span className="font-semibold text-primary">“{q}”</span>
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {pagination ? `${pagination.total} hasil ditemukan` : ""}
          </p>
        </div>

        {response.error === "unavailable" ? (
          <div role="status" className="mt-6">
            <ErrorState title="Pencarian sedang tidak tersedia" />
          </div>
        ) : response.error === "invalid" ? (
          <div className="mt-6">
            <ErrorState title="Parameter pencarian tidak valid" />
          </div>
        ) : !q ? (
          <div className="mt-6">
            <EmptyState
              title="Mulai dengan kata kunci"
              description="Masukkan topik, kompetensi, judul kelas, atau materi yang ingin ditemukan."
            />
          </div>
        ) : response.data?.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Belum ada hasil yang cocok"
              description="Gunakan kata kunci yang lebih umum atau pilih jenis konten lain."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {response.data?.map((document) => {
              const config = domainConfig[document.content_type] || {
                label: "Konten",
                icon: "sparkles" as PortalIconName,
                action: "Buka konten",
              };
              return (
                <article
                  key={document.id}
                  className="flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-gray-800 p-6 group hover:-translate-y-1 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary">
                      <PortalIcon name={config.icon} className="h-3.5 w-3.5" />
                      {config.label}
                    </span>
                    {document.published_at && (
                      <span className="text-slate-400 text-xs">
                        {new Date(document.published_at).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    <Link href={document.url}>{document.title}</Link>
                  </h3>

                  <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed grow line-clamp-3">
                    {document.snippet ||
                      "Buka konten untuk membaca materi dan rincian selengkapnya."}
                  </p>

                  {document.tags && document.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {document.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 truncate max-w-[55%]">
                      {document.hierarchy_path?.length
                        ? document.hierarchy_path.join(" / ")
                        : document.category || "Umum"}
                    </span>
                    <Link
                      href={document.url}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-700 group-hover:translate-x-1 duration-300 transition-transform shrink-0"
                    >
                      {config.action} →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Pagination
          pagination={pagination}
          path="/search"
          getHref={(page) => searchHref({ q, contentType, page, sort })}
        />
      </section>
    </div>
  );
}
