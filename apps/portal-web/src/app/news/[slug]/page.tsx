import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { EditorialBody, EditorialCard, EditorialDetailHero, RelatedContentSection, formatDate } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";
import { StructuredData } from "@/components/structured-data";
import { absolutePublicUrl, metadataFromSEO, type PublicSEO } from "@/lib/discovery/types";

async function getNewsBySlug(slug: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/news/${encodeURIComponent(slug)}`, {
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

async function getRelatedNews(currentSlug: string): Promise<Array<{ id: string; slug: string; title: string; excerpt?: string; published_at?: string }>> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/api/v1/news?page=1&page_size=4`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const payload = await res.json();
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.filter((item: { slug: string }) => item.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

type NewsDetail = { id: string; slug: string; title: string; excerpt?: string; body: string; published_at?: string; updated_at: string; seo?: PublicSEO };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const news = await getNewsBySlug(slug) as NewsDetail | null;
  if (!news) return { title: "Berita tidak ditemukan", robots: { index: false, follow: false } };
  return metadataFromSEO(news.seo, { title: news.title, description: news.excerpt, canonical: `/news/${news.slug}` });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [news, related] = await Promise.all([
    getNewsBySlug(slug) as Promise<NewsDetail | null>,
    getRelatedNews(slug),
  ]);

  if (!news) {
    notFound();
  }

  const canonical = absolutePublicUrl(news.seo?.canonical_path || `/news/${news.slug}`);
  return <article className="pb-16">
    <StructuredData value={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: news.title, description: news.seo?.description || news.excerpt || undefined, datePublished: news.published_at, dateModified: news.seo?.updated_at || news.updated_at, mainEntityOfPage: canonical, image: news.seo?.open_graph_image_url ? absolutePublicUrl(news.seo.open_graph_image_url) : undefined, publisher: { "@type": "Organization", name: "Teman Belajar", url: absolutePublicUrl("/") } }} />
    <StructuredData value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: absolutePublicUrl("/") }, { "@type": "ListItem", position: 2, name: "Berita", item: absolutePublicUrl("/news") }, { "@type": "ListItem", position: 3, name: news.title, item: canonical }] }} />
    <EditorialDetailHero eyebrow="Berita Teman Belajar" title={news.title} summary={news.excerpt || "Informasi dan kabar terbaru Teman Belajar."} breadcrumbs={[{ href: "/", label: "Beranda" }, { href: "/news", label: "Berita" }, { label: "Detail" }]} meta={<span className="inline-flex items-center gap-2"><PortalIcon name="calendar" className="h-4 w-4 text-teal-300" />Terbit {formatDate(news.published_at)}</span>} visual="news" />
    <EditorialBody footer={(news.seo?.category || news.seo?.tags?.length) ? <div className="flex flex-wrap gap-2">{news.seo.category && <Link href={`/categories/${news.seo.category.slug}`} className="portal-badge">{news.seo.category.name}</Link>}{news.seo.tags.map((tag) => <Link key={tag.id} href={`/tags/${tag.slug}`} className="portal-filter">#{tag.name}</Link>)}</div> : undefined}><MarkdownRenderer content={news.body} /></EditorialBody>
    {related && related.length > 0 ? (
      <RelatedContentSection
        eyebrow="Kabar Lainnya"
        title="Berita Terkait Lainnya"
        viewAllHref="/news"
        viewAllLabel="Lihat Semua Berita →"
      >
        {related.map((item) => (
          <EditorialCard
            key={item.id}
            href={`/news/${item.slug}`}
            title={item.title}
            summary={item.excerpt}
            label="Berita"
            dateLabel={formatDate(item.published_at)}
            actionLabel="Baca berita"
            icon="news"
          />
        ))}
      </RelatedContentSection>
    ) : null}
  </article>;
}
