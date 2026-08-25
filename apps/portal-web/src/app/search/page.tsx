import Link from "next/link";
import { ErrorState, PageHero } from "@/components/public-content";
import { PortalIcon } from "@/components/portal-icon";

export const metadata = { title: "Pencarian Teman Belajar", robots: { index: false, follow: true } };

const contentTypes = [
  { value: "", label: "Semua" },
  { value: "course", label: "Kelas" },
  { value: "knowledge", label: "Pengetahuan" },
  { value: "news", label: "Berita" },
  { value: "announcement", label: "Pengumuman" },
] as const;

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
  pagination?: { page: number; page_size: number; total: number; total_pages: number };
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
  if (!q) return { data: [], pagination: { page: 1, page_size: 12, total: 0, total_pages: 0 } };
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { error: "unavailable" };

  const query = new URLSearchParams({ q, page: parameters.page ?? "1", page_size: "12", sort: parameters.sort ?? "relevance" });
  if (parameters.content_type) query.set("content_type", parameters.content_type);
  try {
    const response = await fetch(`${apiBase}/api/v1/search?${query}`, { cache: "no-store" });
    if (response.status === 422) return { error: "invalid" };
    if (!response.ok) return { error: "unavailable" };
    return (await response.json()) as SearchResponse;
  } catch {
    return { error: "unavailable" };
  }
}

function searchHref(parameters: { q: string; contentType?: string; page?: number; sort?: string }) {
  const query = new URLSearchParams({ q: parameters.q });
  if (parameters.contentType) query.set("content_type", parameters.contentType);
  if (parameters.page && parameters.page > 1) query.set("page", String(parameters.page));
  if (parameters.sort && parameters.sort !== "relevance") query.set("sort", parameters.sort);
  return `/search?${query}`;
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { course: "Kelas", knowledge: "Pengetahuan", news: "Berita", announcement: "Pengumuman" };
  return <span className="portal-badge">{labels[type] ?? "Konten"}</span>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parameters = await searchParams;
  const q = (parameters.q ?? "").slice(0, 200);
  const contentType = parameters.content_type ?? "";
  const sort = parameters.sort === "newest" || parameters.sort === "oldest" ? parameters.sort : "relevance";
  const response = await search({ ...parameters, q, content_type: contentType, sort });
  const pagination = response.pagination;

  return (
    <div>
      <PageHero
        eyebrow="Pencarian terpadu"
        title={q ? `Hasil pencarian untuk “${q}”` : "Temukan materi yang Anda perlukan"}
        description="Cari kelas Moodle yang terlihat, pengetahuan terbit, berita, dan pengumuman aktif dari satu tempat."
      />

      <section className="portal-container py-10 sm:py-14" aria-labelledby="search-results-heading">
        <form action="/search" method="get" role="search" className="portal-card grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end">
          <div>
            <label htmlFor="search-query" className="portal-label">Kata kunci</label>
            <div className="relative mt-2">
              <PortalIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="search-query" name="q" type="search" required maxLength={200} defaultValue={q} placeholder="Contoh: keamanan informasi" className="portal-search-input w-full !rounded-xl !pl-12" />
            </div>
          </div>
          <div>
            <label htmlFor="search-sort" className="portal-label">Urutkan</label>
            <select id="search-sort" name="sort" defaultValue={sort} className="portal-control mt-2 w-full">
              <option value="relevance">Paling relevan</option>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
          {contentType ? <input type="hidden" name="content_type" value={contentType} /> : null}
          <button type="submit" className="portal-button-primary justify-center">Cari</button>
        </form>

        <nav className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Filter jenis konten">
          {contentTypes.map((item) => (
            <Link key={item.value || "all"} href={searchHref({ q, contentType: item.value, sort })} aria-current={contentType === item.value ? "page" : undefined} className={contentType === item.value ? "portal-filter-active" : "portal-filter"}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8">
          <h2 id="search-results-heading" className="text-xl font-extrabold text-slate-900">
            {pagination ? `${pagination.total} hasil ditemukan` : "Hasil pencarian"}
          </h2>
          <p className="sr-only" aria-live="polite">{pagination ? `${pagination.total} hasil ditemukan` : ""}</p>
        </div>

        {response.error === "unavailable" ? (
          <div role="status" className="mt-6"><ErrorState title="Pencarian sedang tidak tersedia" /></div>
        ) : response.error === "invalid" ? (
          <div role="alert" className="portal-card mt-6 p-8 text-center"><h3 className="font-extrabold text-slate-900">Parameter pencarian tidak valid</h3><p className="mt-2 text-sm text-slate-600">Periksa kata kunci dan filter, kemudian coba lagi.</p></div>
        ) : !q ? (
          <div className="portal-card mt-6 p-10 text-center"><PortalIcon name="search" className="mx-auto h-9 w-9 text-teal-700" /><h3 className="mt-4 text-lg font-extrabold text-slate-900">Mulai dengan kata kunci</h3><p className="mt-2 text-sm text-slate-600">Masukkan topik, judul kelas, atau materi yang ingin ditemukan.</p></div>
        ) : response.data?.length === 0 ? (
          <div className="portal-card mt-6 p-10 text-center"><h3 className="text-lg font-extrabold text-slate-900">Belum ada hasil yang cocok</h3><p className="mt-2 text-sm text-slate-600">Gunakan kata yang lebih umum atau pilih jenis konten lain.</p></div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {response.data?.map((document) => (
              <article key={document.id} className="portal-card group flex min-h-64 flex-col p-6">
                <TypeBadge type={document.content_type} />
                <h3 className="mt-5 text-lg font-extrabold leading-7 text-slate-900"><Link href={document.url} className="transition hover:text-teal-700">{document.title}</Link></h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{document.snippet || "Buka konten untuk melihat informasi selengkapnya."}</p>
                {document.hierarchy_path?.length ? <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">{document.hierarchy_path.join(" / ")}</p> : document.category ? <p className="mt-4 text-xs font-semibold text-slate-500">{document.category}</p> : null}
                <Link href={document.url} className="mt-auto border-t border-slate-100 pt-5 text-sm font-extrabold text-teal-700">Buka konten <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        )}

        {pagination && pagination.total_pages > 1 ? (
          <nav className="mt-10 flex flex-wrap items-center justify-center gap-3" aria-label="Halaman hasil pencarian">
            {pagination.page > 1 ? <Link className="portal-button-secondary" href={searchHref({ q, contentType, page: pagination.page - 1, sort })}>Sebelumnya</Link> : null}
            <span className="px-3 text-sm font-semibold text-slate-600">Halaman {pagination.page} dari {pagination.total_pages}</span>
            {pagination.page < pagination.total_pages ? <Link className="portal-button-secondary" href={searchHref({ q, contentType, page: pagination.page + 1, sort })}>Berikutnya</Link> : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
