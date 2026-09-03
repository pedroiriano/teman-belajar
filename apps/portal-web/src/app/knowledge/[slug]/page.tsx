import { getServerSession } from "next-auth/next";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { KnowledgeEngagement } from "@/components/engagement/knowledge-engagement";
import { MarkdownRenderer, extractMarkdownHeadings } from "@/components/markdown-renderer";
import { KnowledgeTree, type PublicKnowledgeTreeResponse } from "@/components/knowledge/knowledge-tree";
import { PortalIcon } from "@/components/portal-icon";
import { StructuredData } from "@/components/structured-data";
import { EditorialCard, EditorialDetailHero, RelatedContentSection } from "@/components/techwind";
import { authOptions } from "@/lib/auth";
import type { RatingSummary } from "@/lib/engagement/types";
import { absolutePublicUrl, metadataFromSEO, type PublicSEO } from "@/lib/discovery/types";

type KnowledgeArticle = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  body: string;
  published_at?: string;
  last_reviewed_at?: string;
  related?: Array<{ id: string; slug: string; title: string; summary?: string }>;
  hierarchy?: { node_id: string; breadcrumbs: Array<{ id: string; slug: string; title: string; type: string }> };
  seo?: PublicSEO;
};

async function getKnowledgeBySlug(slug: string): Promise<KnowledgeArticle | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return null;
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/knowledge/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 }, redirect: "manual"
  });
  if (res.status === 301 || res.status === 308) { const location = res.headers.get("location"); if (location?.startsWith("/knowledge/")) permanentRedirect(location); }
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch knowledge article');
  }
  return res.json();
}

async function getRatingSummary(targetId: string): Promise<RatingSummary> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { average: 0, count: 0 };
  try {
    const response = await fetch(`${apiBase}/api/v1/ratings/knowledge/${targetId}`, { next: { revalidate: 60 } });
    if (!response.ok) return { average: 0, count: 0 };
    return response.json();
  } catch { return { average: 0, count: 0 }; }
}

async function getKnowledgeTree(): Promise<PublicKnowledgeTreeResponse | null> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return null;
  try {
    const response = await fetch(`${apiBase}/api/v1/knowledge/tree`, { next: { revalidate: 60 } });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getKnowledgeBySlug(slug);
  if (!article) return { title: "Artikel tidak ditemukan" };
  return metadataFromSEO(article.seo, { title: article.title, description: article.summary || "Artikel Pusat Pengetahuan Teman Belajar", canonical: `/knowledge/${article.slug}` });
}

function formatDate(value?: string) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function getReadingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getKnowledgeBySlug(slug);

  if (!article) {
    notFound();
  }

  const [session, ratingSummary, treeResponse] = await Promise.all([getServerSession(authOptions), getRatingSummary(article.id), getKnowledgeTree()]);
  const tree = treeResponse?.data ?? [];
  const headings = extractMarkdownHeadings(article.body);
  const canonical = absolutePublicUrl(article.seo?.canonical_path || `/knowledge/${article.slug}`);
  const readingTime = getReadingTimeMinutes(article.body);

  return (
    <article className="pb-20">
      <StructuredData value={{ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.seo?.description || article.summary || undefined, datePublished: article.published_at, dateModified: article.seo?.updated_at || article.last_reviewed_at || article.published_at, mainEntityOfPage: canonical, image: article.seo?.open_graph_image_url ? absolutePublicUrl(article.seo.open_graph_image_url) : undefined, publisher: { "@type": "Organization", name: "Teman Belajar", url: absolutePublicUrl("/") } }} />
      <StructuredData value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Pusat Pengetahuan", item: absolutePublicUrl("/knowledge") }, ...(article.hierarchy?.breadcrumbs || []).map((crumb, index) => ({ "@type": "ListItem", position: index + 2, name: crumb.title, item: absolutePublicUrl(`/knowledge/topics/${encodeURIComponent(crumb.id)}`) })), { "@type": "ListItem", position: (article.hierarchy?.breadcrumbs.length || 0) + 2, name: article.title, item: canonical }] }} />
      <EditorialDetailHero eyebrow="Wawasan terverifikasi" title={article.title} summary={article.summary} breadcrumbs={[{ href: "/", label: "Beranda" }, { href: "/knowledge", label: "Pusat Pengetahuan" }, ...(article.hierarchy?.breadcrumbs || []).map((crumb) => ({ href: `/knowledge/topics/${encodeURIComponent(crumb.id)}`, label: crumb.title })), { label: "Artikel" }]} meta={<><span className="inline-flex items-center gap-2"><PortalIcon name="calendar" className="h-4 w-4 text-teal-300" />Terbit {formatDate(article.published_at)}</span><span className="inline-flex items-center gap-2"><PortalIcon name="shield" className="h-4 w-4 text-teal-300" />Ditinjau {formatDate(article.last_reviewed_at)}</span></>} />

      <div className="portal-container relative -mt-10 pb-4">
        <KnowledgeTree nodes={tree} activeNodeId={article.hierarchy?.node_id} mobile />
        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_16rem] lg:items-start">
          <KnowledgeTree nodes={tree} activeNodeId={article.hierarchy?.node_id} />
          <main>
            <KnowledgeEngagement targetId={article.id} authenticated={Boolean(session)} initialSummary={ratingSummary} />
            {headings.length ? (
              <details className="portal-card mb-5 p-4 lg:hidden">
                <summary className="cursor-pointer list-none font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Daftar isi artikel</span>
                  <span className="text-xs text-primary font-normal">{readingTime} mnt baca</span>
                </summary>
                <ol className="mt-4 space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                  {headings.map((heading) => (
                    <li key={heading.id} className={heading.level === 3 ? "pl-4 text-xs" : ""}>
                      <a href={`#${heading.id}`} className="text-primary hover:underline">
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
            <div className="portal-card p-6 sm:p-10 lg:p-12">
              <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-700 transition-colors">
                <span aria-hidden="true">←</span>Kembali ke Pusat Pengetahuan
              </Link>
              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
                <MarkdownRenderer content={article.body} />
              </div>
              {(article.seo?.category || article.seo?.tags?.length) && (
                <footer className="mt-10 border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex flex-wrap gap-2">
                    {article.seo.category && (
                      <Link href={`/categories/${article.seo.category.slug}`} className="portal-badge">
                        {article.seo.category.name}
                      </Link>
                    )}
                    {article.seo.tags.map((tag) => (
                      <Link key={tag.id} href={`/tags/${tag.slug}`} className="portal-filter">
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </footer>
              )}
            </div>
          </main>
          <aside className="space-y-5 sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:block" aria-label="Informasi dan daftar isi artikel">
            <div className="portal-card p-5">
              <p className="portal-eyebrow">Informasi Artikel</p>
              <ul className="mt-4 space-y-3 text-xs">
                <li className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                  <PortalIcon name="book" className="h-4 w-4 text-primary shrink-0" />
                  <span>Estimasi: <strong className="text-slate-900 dark:text-white">{readingTime} menit baca</strong></span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                  <PortalIcon name="shield" className="h-4 w-4 text-primary shrink-0" />
                  <span>Status: <strong className="text-slate-900 dark:text-white">Terverifikasi</strong></span>
                </li>
                {article.hierarchy?.breadcrumbs?.length ? (
                  <li className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                    <PortalIcon name="book" className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">Topik: <strong className="text-slate-900 dark:text-white">{article.hierarchy.breadcrumbs[article.hierarchy.breadcrumbs.length - 1].title}</strong></span>
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="portal-card p-5">
              <p className="portal-eyebrow">Dalam artikel</p>
              <h2 className="mt-1 font-bold text-slate-900 dark:text-white">Daftar isi</h2>
              {headings.length ? (
                <ol className="mt-4 space-y-2.5 text-sm">
                  {headings.map((heading) => (
                    <li key={heading.id} className={heading.level === 3 ? "pl-3 text-xs" : ""}>
                      <a href={`#${heading.id}`} className="text-slate-600 dark:text-slate-400 transition hover:text-primary dark:hover:text-primary">
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Artikel ini belum memiliki subjudul.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {article.related && article.related.length > 0 ? (
        <RelatedContentSection
          eyebrow="Baca Selanjutnya"
          title="Artikel Terkait Lainnya"
          viewAllHref="/knowledge"
          viewAllLabel="Lihat Semua Pengetahuan →"
          className="mt-12"
        >
          {article.related.map((item) => (
            <EditorialCard
              key={item.id}
              href={`/knowledge/${item.slug}`}
              title={item.title}
              summary={item.summary}
              label="Artikel Pengetahuan"
              actionLabel="Baca artikel"
              icon="book"
              headingLevel="h3"
            />
          ))}
        </RelatedContentSection>
      ) : null}
    </article>
  );
}
