import Link from "next/link";
import type { Metadata } from "next";
import { EditorialCard, EditorialDetailHero, EmptyState, ErrorState, formatDate, Pagination, type PaginationData } from "@/components/techwind";

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

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const query = await searchParams; const page = Number.parseInt(query.page || "1", 10) || 1;
  return { title: "Berita", description: "Kabar dan perkembangan terbaru Teman Belajar.", alternates: { canonical: "/news" }, robots: { index: page <= 1, follow: true } };
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const result = await getNews(page);
  return <><EditorialDetailHero eyebrow="Berita" title="Berita Pembelajaran" summary="Ikuti kabar terbaru mengenai program, materi, dan ekosistem pembelajaran." breadcrumbs={[{ href: "/", label: "Beranda" }, { label: "Berita" }]} visual="news"/><section className="portal-container py-12 sm:py-16">{result.error ? <ErrorState title="Berita belum dapat dimuat"/> : result.data.length === 0 ? <EmptyState title="Belum ada berita" description="Berita yang telah melewati proses editorial akan tampil di halaman ini."/> : <><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{result.data.map((news) => <EditorialCard key={news.id} href={`/news/${news.slug}`} title={news.title} summary={news.excerpt} label="Berita" dateLabel={formatDate(news.published_at)} actionLabel="Baca berita" icon="news" />)}</div><Pagination pagination={result.pagination} path="/news"/></>}</section></>;
}
