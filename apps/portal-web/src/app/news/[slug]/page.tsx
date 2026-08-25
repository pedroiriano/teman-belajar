import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PageHero, formatDate } from "@/components/public-content";
import { StructuredData } from "@/components/structured-data";
import { absolutePublicUrl, metadataFromSEO, type PublicSEO } from "@/lib/discovery/types";

async function getNewsBySlug(slug: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/news/${slug}`, {
    next: { revalidate: 60 }, redirect: "manual"
  });
  if (res.status === 301 || res.status === 308) { const location = res.headers.get("location"); if (location?.startsWith("/news/")) permanentRedirect(location); }
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch news');
  }
  return res.json();
}

type NewsDetail = { id: string; slug: string; title: string; excerpt?: string; body: string; published_at?: string; updated_at: string; seo?: PublicSEO };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const news = await getNewsBySlug(slug) as NewsDetail | null;
  if (!news) return { title: "Berita tidak ditemukan", robots: { index: false, follow: false } };
  return metadataFromSEO(news.seo, { title: news.title, description: news.excerpt, canonical: `/news/${news.slug}` });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug) as NewsDetail | null;

  if (!news) {
    notFound();
  }

  const canonical = absolutePublicUrl(news.seo?.canonical_path || `/news/${news.slug}`);
  return <article className="pb-16">
    <StructuredData value={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: news.title, description: news.seo?.description || news.excerpt || undefined, datePublished: news.published_at, dateModified: news.seo?.updated_at || news.updated_at, mainEntityOfPage: canonical, image: news.seo?.open_graph_image_url ? absolutePublicUrl(news.seo.open_graph_image_url) : undefined, publisher: { "@type": "Organization", name: "Teman Belajar", url: absolutePublicUrl("/") } }} />
    <StructuredData value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: absolutePublicUrl("/") }, { "@type": "ListItem", position: 2, name: "Berita", item: absolutePublicUrl("/news") }, { "@type": "ListItem", position: 3, name: news.title, item: canonical }] }} />
    <PageHero eyebrow="Berita Teman Belajar" title={news.title} description={`${news.excerpt || "Informasi dan kabar terbaru Teman Belajar."} · Terbit ${formatDate(news.published_at)}`} />
    <div className="portal-container max-w-4xl py-10"><nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-sm text-slate-500"><Link href="/" className="font-bold text-teal-700">Beranda</Link><span aria-hidden="true">/</span><Link href="/news" className="font-bold text-teal-700">Berita</Link><span aria-hidden="true">/</span><span aria-current="page">Detail</span></nav><div className="portal-card p-6 sm:p-10"><MarkdownRenderer content={news.body} />{(news.seo?.category || news.seo?.tags?.length) && <footer className="mt-10 border-t border-slate-200 pt-6"><div className="flex flex-wrap gap-2">{news.seo.category && <Link href={`/categories/${news.seo.category.slug}`} className="portal-badge">{news.seo.category.name}</Link>}{news.seo.tags.map((tag) => <Link key={tag.id} href={`/tags/${tag.slug}`} className="portal-filter">#{tag.name}</Link>)}</div></footer>}</div></div>
  </article>;
}
