import Link from "next/link";
import { EmptyState, ErrorState, formatDate, PageHero, Pagination, type PaginationData } from "@/components/public-content";

type News = { id: string; slug: string; title: string; excerpt?: string; published_at?: string };
type NewsResult = { data: News[]; pagination?: PaginationData; error?: true };

async function getNews(page: number): Promise<NewsResult> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { data: [], error: true };
  try {
    const res = await fetch(`${apiBase}/api/v1/news?page=${page}&page_size=9`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

export default async function NewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number.parseInt(searchParams.page || "1", 10) || 1);
  const result = await getNews(page);
  return <><PageHero eyebrow="Kabar Teman Belajar" title="Cerita dan perkembangan terbaru" description="Ikuti program, inisiatif, dan wawasan terbaru yang mendukung perjalanan belajar di organisasi Anda."/><section className="portal-container py-12 sm:py-16">{result.error ? <ErrorState title="Berita belum dapat dimuat"/> : result.data.length === 0 ? <EmptyState title="Belum ada berita" description="Berita yang telah melewati proses editorial akan tampil di halaman ini."/> : <><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{result.data.map((news, index) => <article key={news.id} className="portal-card group flex min-h-72 flex-col overflow-hidden"><div className={`h-2 ${index % 3 === 0 ? "bg-teal-600" : index % 3 === 1 ? "bg-sky-600" : "bg-amber-500"}`}/><div className="flex flex-1 flex-col p-6"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{formatDate(news.published_at)}</p><h2 className="mt-3 text-xl font-extrabold leading-7 text-slate-900"><Link href={`/news/${news.slug}`} className="transition group-hover:text-teal-700">{news.title}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{news.excerpt || "Baca kabar selengkapnya dari Teman Belajar."}</p><Link href={`/news/${news.slug}`} className="mt-auto pt-6 text-sm font-bold text-teal-700">Baca selengkapnya <span aria-hidden="true">→</span></Link></div></article>)}</div><Pagination pagination={result.pagination} path="/news"/></>}</section></>;
}
