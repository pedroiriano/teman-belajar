import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KnowledgeEngagement } from "@/components/engagement/knowledge-engagement";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PortalIcon } from "@/components/portal-icon";
import { authOptions } from "@/lib/auth";
import type { RatingSummary } from "@/lib/engagement/types";

type KnowledgeArticle = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  body: string;
  published_at?: string;
  last_reviewed_at?: string;
  related?: Array<{ id: string; slug: string; title: string; summary?: string }>;
};

async function getKnowledgeBySlug(slug: string): Promise<KnowledgeArticle | null> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/knowledge/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 }
  });
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

function formatDate(value?: string) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getKnowledgeBySlug(slug);

  if (!article) {
    notFound();
  }

  const [session, ratingSummary] = await Promise.all([getServerSession(authOptions), getRatingSummary(article.id)]);

  return (
    <article className="pb-20">
      <header className="relative overflow-hidden bg-[#102a43] text-white">
        <div className="portal-hero-orb portal-hero-orb-one" aria-hidden="true" />
        <div className="portal-hero-orb portal-hero-orb-two" aria-hidden="true" />
        <div className="portal-container relative py-16 text-center sm:py-24">
          <nav aria-label="Breadcrumb" className="mb-6 flex justify-center gap-2 text-sm text-teal-100"><Link href="/knowledge" className="font-bold hover:text-white">Pusat Pengetahuan</Link><span aria-hidden="true">/</span><span>Artikel</span></nav>
          <p className="mx-auto w-fit rounded-full bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[.18em] text-teal-200">Wawasan terverifikasi</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">{article.title}</h1>
          {article.summary && <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{article.summary}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-300"><span className="inline-flex items-center gap-2"><PortalIcon name="calendar" className="h-4 w-4 text-teal-300" />Terbit {formatDate(article.published_at)}</span><span className="inline-flex items-center gap-2"><PortalIcon name="shield" className="h-4 w-4 text-teal-300" />Ditinjau {formatDate(article.last_reviewed_at)}</span></div>
        </div>
      </header>

      <div className="portal-container relative -mt-10">
        <div className="mx-auto max-w-4xl">
          <KnowledgeEngagement targetId={article.id} authenticated={Boolean(session)} initialSummary={ratingSummary} />
          <div className="portal-card p-6 sm:p-10 lg:p-12">
            <Link href="/knowledge" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700"><span aria-hidden="true">←</span>Kembali ke Pusat Pengetahuan</Link>
            <div className="mt-8 border-t border-slate-200 pt-8"><MarkdownRenderer content={article.body} /></div>
          </div>
        </div>
        {article.related && article.related.length > 0 && <section className="mx-auto mt-14 max-w-4xl" aria-labelledby="related-knowledge"><p className="portal-eyebrow">Baca selanjutnya</p><h2 id="related-knowledge" className="mt-2 text-2xl font-black text-slate-900">Konten terkait</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{article.related.map((item) => <article key={item.id} className="portal-card p-5"><h3 className="font-black text-slate-900"><Link href={`/knowledge/${item.slug}`} className="hover:text-teal-700">{item.title}</Link></h3>{item.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.summary}</p>}</article>)}</div></section>}
      </div>
    </article>
  );
}
