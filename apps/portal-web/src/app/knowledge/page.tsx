import Link from "next/link";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { KnowledgeTree, findKnowledgeNode, type PublicKnowledgeTreeResponse } from "@/components/knowledge/knowledge-tree";
import { EditorialCard, EmptyState, ErrorState, FilterBar, formatDate, FullScreenHero, Pagination, SearchField, type PaginationData } from "@/components/techwind";

type Article = { id: string; slug: string; title: string; summary?: string; last_reviewed_at?: string };
type Result = { data: Article[]; pagination?: PaginationData; error?: true };

async function getKnowledge(page: number, node?: string): Promise<Result> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return { data: [], error: true };
  const query = new URLSearchParams({ page: String(page), page_size: "9" });
  if (node) query.set("node", node);
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/knowledge?${query}`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

async function getTree(): Promise<PublicKnowledgeTreeResponse | null> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return null;
  try {
    const response = await fetch(`${API_BASE}/api/v1/knowledge/tree`, { next: { revalidate: 60 } });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

function knowledgePath(nodeId: string | undefined, page: number) {
  const query = new URLSearchParams();
  if (nodeId) query.set("node", nodeId);
  if (page > 1) query.set("page", String(page));
  return `/knowledge${query.size ? `?${query}` : ""}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string; node?: string }> }): Promise<Metadata> {
  const query = await searchParams; const page = Number.parseInt(query.page || "1", 10) || 1;
  return { title: "Pusat Pengetahuan", description: "Jelajahi pengetahuan terverifikasi Teman Belajar.", alternates: { canonical: "/knowledge" }, robots: { index: page <= 1 && !query.node, follow: true } };
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ page?: string; node?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const nodeId = query.node && /^[0-9a-f-]{36}$/i.test(query.node) ? query.node : undefined;
  if (nodeId) permanentRedirect(`/knowledge/topics/${nodeId}`);
  const [knowledgeResponse, treeResponse] = await Promise.all([getKnowledge(page, nodeId), getTree()]);
  const tree = treeResponse?.data ?? [];
  const selection = findKnowledgeNode(tree, nodeId);

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Pusat Pengetahuan" },
  ];

  return (
    <div>
      <FullScreenHero
        title="Pusat Pengetahuan"
        description="Temukan panduan terverifikasi, artikel wawasan, dan jelajahi struktur pengetahuan organisasi dalam satu tempat."
        backgroundImage="/techwind-hero/blog.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      />
      <section className="portal-container py-10 sm:py-14">
        <FilterBar action="/search" method="get" role="search" className="mb-8 grid items-end gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
          <input type="hidden" name="content_type" value="knowledge" />
          <SearchField id="knowledge-query" name="q" label="Cari pengetahuan" placeholder="Cari topik, judul, atau informasi" required={false} />
          <button type="submit" className="portal-button-primary w-full lg:w-auto">Cari Pengetahuan</button>
        </FilterBar>
        <KnowledgeTree nodes={tree} activeNodeId={nodeId} mobile />
        <div className="mt-6 grid gap-6 lg:mt-0 lg:grid-cols-[16rem_minmax(0,1fr)_14rem] lg:items-start">
          <KnowledgeTree nodes={tree} activeNodeId={nodeId} />
          <main id="knowledge-results" tabIndex={-1}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="portal-eyebrow">{selection ? "Hasil terfilter" : "Artikel terbaru"}</p><h2 className="mt-2 text-2xl font-black text-slate-900">{selection?.node.title ?? "Semua pengetahuan"}</h2>{selection?.node.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{selection.node.description}</p> : null}</div>{selection ? <Link href="/knowledge" className="portal-button-secondary">Hapus filter</Link> : null}</div>
            {knowledgeResponse.error ? <ErrorState title="Pusat Pengetahuan belum dapat dimuat" /> : knowledgeResponse.data.length === 0 ? <EmptyState title="Belum ada artikel" description={selection ? "Node ini belum mempunyai artikel terbit." : "Artikel yang telah disetujui dan diterbitkan akan tampil di sini."} /> : <><div className="grid gap-5 md:grid-cols-2">{knowledgeResponse.data.map((article: Article) => <EditorialCard key={article.id} href={`/knowledge/${article.slug}`} title={article.title} summary={article.summary} label="Panduan" dateLabel={article.last_reviewed_at ? `Ditinjau ${formatDate(article.last_reviewed_at)}` : undefined} headingLevel="h3" />)}</div><Pagination pagination={knowledgeResponse.pagination} path="/knowledge" getHref={(targetPage) => knowledgePath(nodeId, targetPage)} /></>}
          </main>
          <aside className="portal-card sticky top-24 hidden p-5 lg:block" aria-label="Konteks hierarchy"><p className="portal-eyebrow">Konteks</p><h2 className="mt-2 font-black text-slate-900">{selection ? "Lokasi saat ini" : "Mulai menjelajah"}</h2>{selection ? <ol className="mt-4 space-y-2 text-sm text-slate-600">{selection.trail.map((item) => <li key={item.id}>{item.title}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-slate-600">Pilih node pada tree untuk memfilter artikel tanpa kehilangan struktur.</p>}</aside>
        </div>
      </section>
    </div>
  );
}
