import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { EditorialBody, EditorialCard, EditorialDetailHero, RelatedContentSection, formatDate } from "@/components/techwind";
import { StructuredData } from "@/components/structured-data";
import { absolutePublicUrl, metadataFromSEO, type PublicSEO } from "@/lib/discovery/types";

type Announcement = { id: string; slug: string; title: string; body: string; published_at?: string; updated_at: string; start_at?: string; end_at?: string; seo?: PublicSEO };

async function getAnnouncement(slug: string): Promise<Announcement | null> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) throw new Error("Missing PORTAL_API_INTERNAL_URL");
  const response = await fetch(`${apiBase}/api/v1/announcements/${encodeURIComponent(slug)}`, { next: { revalidate: 60 }, redirect: "manual" });
  if (response.status === 301 || response.status === 308) { const location = response.headers.get("location"); if (location?.startsWith("/announcements/")) permanentRedirect(location); }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load announcement");
  return response.json();
}

async function getRelatedAnnouncements(currentSlug: string): Promise<Announcement[]> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/api/v1/announcements`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const payload = await res.json();
    const list: Announcement[] = Array.isArray(payload.data) ? payload.data : [];
    return list.filter((item) => item.slug !== currentSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const announcement = await getAnnouncement(slug);
  if (!announcement) return { title: "Pengumuman tidak ditemukan", robots: { index: false, follow: false } };
  return metadataFromSEO(announcement.seo, { title: announcement.title, description: announcement.body.slice(0, 300), canonical: `/announcements/${announcement.slug}` });
}

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [announcement, related] = await Promise.all([
    getAnnouncement(slug),
    getRelatedAnnouncements(slug),
  ]);
  if (!announcement) notFound();
  const canonical = absolutePublicUrl(announcement.seo?.canonical_path || `/announcements/${announcement.slug}`);
  return <article className="pb-16">
    <StructuredData value={{ "@context": "https://schema.org", "@type": "Article", headline: announcement.title, description: announcement.seo?.description || announcement.body.slice(0, 300), datePublished: announcement.published_at, dateModified: announcement.seo?.updated_at || announcement.updated_at, mainEntityOfPage: canonical, image: announcement.seo?.open_graph_image_url ? absolutePublicUrl(announcement.seo.open_graph_image_url) : undefined, publisher: { "@type": "Organization", name: "Teman Belajar", url: absolutePublicUrl("/") } }} />
    <StructuredData value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: absolutePublicUrl("/") }, { "@type": "ListItem", position: 2, name: "Pengumuman", item: absolutePublicUrl("/announcements") }, { "@type": "ListItem", position: 3, name: announcement.title, item: canonical }] }} />
    <EditorialDetailHero eyebrow="Pengumuman Teman Belajar" title={announcement.title} summary={announcement.start_at ? `Berlaku mulai ${formatDate(announcement.start_at)}${announcement.end_at ? ` hingga ${formatDate(announcement.end_at)}` : ""}.` : "Informasi resmi Teman Belajar."} breadcrumbs={[{ href: "/", label: "Beranda" }, { href: "/announcements", label: "Pengumuman" }, { label: "Detail" }]} visual="announcement" />
    <EditorialBody footer={(announcement.seo?.category || announcement.seo?.tags?.length) ? <div className="flex flex-wrap gap-2">{announcement.seo.category && <Link href={`/categories/${announcement.seo.category.slug}`} className="portal-badge">{announcement.seo.category.name}</Link>}{announcement.seo.tags.map((tag) => <Link key={tag.id} href={`/tags/${tag.slug}`} className="portal-filter">#{tag.name}</Link>)}</div> : undefined}><MarkdownRenderer content={announcement.body} /></EditorialBody>
    {related && related.length > 0 ? (
      <RelatedContentSection
        eyebrow="Pemberitahuan Lainnya"
        title="Pengumuman Terkait Lainnya"
        viewAllHref="/announcements"
        viewAllLabel="Lihat Semua Pengumuman →"
      >
        {related.map((item) => (
          <EditorialCard
            key={item.id}
            href={`/announcements/${item.slug}`}
            title={item.title}
            summary={item.body.slice(0, 160)}
            label="Pengumuman"
            dateLabel={formatDate(item.published_at || item.updated_at)}
            actionLabel="Baca pengumuman"
            icon="news"
          />
        ))}
      </RelatedContentSection>
    ) : null}
  </article>;
}
