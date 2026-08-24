import Link from "next/link";
import { KnowledgeTree, findKnowledgeNode, type PublicKnowledgeTreeResponse } from "@/components/knowledge/knowledge-tree";
import { EmptyState, ErrorState, formatDate, PageHero, type PaginationData } from "@/components/public-content";

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

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ page?: string; node?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const nodeId = query.node && /^[0-9a-f-]{36}$/i.test(query.node) ? query.node : undefined;
  const [knowledgeResponse, treeResponse] = await Promise.all([getKnowledge(page, nodeId), getTree()]);
  const tree = treeResponse?.data ?? [];
  const selection = findKnowledgeNode(tree, nodeId);

  return (
    <div>
      <PageHero eyebrow="Pusat Pengetahuan" title="Wawasan tepercaya dalam konteks yang jelas" description="Jelajahi hierarchy, temukan artikel terverifikasi, dan pertahankan konteks saat berpindah topik." />
      <section className="portal-container py-10 sm:py-14">
        <KnowledgeTree nodes={tree} activeNodeId={nodeId} mobile />
        <div className="mt-6 grid gap-6 lg:mt-0 lg:grid-cols-[16rem_minmax(0,1fr)_14rem] lg:items-start">
          <KnowledgeTree nodes={tree} activeNodeId={nodeId} />
          <main id="knowledge-results" tabIndex={-1}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="portal-eyebrow">{selection ? "Hasil terfilter" : "Artikel terbaru"}</p><h2 className="mt-2 text-2xl font-black text-slate-900">{selection?.node.title ?? "Semua pengetahuan"}</h2>{selection?.node.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{selection.node.description}</p> : null}</div>{selection ? <Link href="/knowledge" className="portal-button-secondary">Hapus filter</Link> : null}</div>
            {knowledgeResponse.error ? <ErrorState title="Pusat Pengetahuan belum dapat dimuat" /> : knowledgeResponse.data.length === 0 ? <EmptyState title="Belum ada artikel" description={selection ? "Node ini belum mempunyai artikel terbit." : "Artikel yang telah disetujui dan diterbitkan akan tampil di sini."} /> : <><div className="grid gap-5 md:grid-cols-2">{knowledgeResponse.data.map((article: Article) => <article key={article.id} className="portal-card group flex min-h-64 flex-col p-6"><span className="portal-badge">Panduan</span><h3 className="mt-5 text-xl font-extrabold leading-7 text-slate-900"><Link href={`/knowledge/${article.slug}`} className="transition group-hover:text-teal-700">{article.title}</Link></h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary || "Buka artikel untuk membaca panduan selengkapnya."}</p><div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500"><span>{article.last_reviewed_at ? `Ditinjau ${formatDate(article.last_reviewed_at)}` : "Konten terkurasi"}</span><span className="font-bold text-teal-700">Baca →</span></div></article>)}</div>{knowledgeResponse.pagination && knowledgeResponse.pagination.total_pages > 1 ? <nav className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6" aria-label="Paginasi"><Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={knowledgePath(nodeId, Math.max(1, page - 1))} className={`portal-button-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Sebelumnya</Link><p className="text-sm font-semibold text-slate-500">Halaman {page} dari {knowledgeResponse.pagination.total_pages}</p><Link aria-disabled={page >= knowledgeResponse.pagination.total_pages} tabIndex={page >= knowledgeResponse.pagination.total_pages ? -1 : undefined} href={knowledgePath(nodeId, Math.min(knowledgeResponse.pagination.total_pages, page + 1))} className={`portal-button-secondary ${page >= knowledgeResponse.pagination.total_pages ? "pointer-events-none opacity-40" : ""}`}>Berikutnya →</Link></nav> : null}</>}
          </main>
          <aside className="portal-card sticky top-24 hidden p-5 lg:block" aria-label="Konteks hierarchy"><p className="portal-eyebrow">Konteks</p><h2 className="mt-2 font-black text-slate-900">{selection ? "Lokasi saat ini" : "Mulai menjelajah"}</h2>{selection ? <ol className="mt-4 space-y-2 text-sm text-slate-600">{selection.trail.map((item) => <li key={item.id}>{item.title}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-slate-600">Pilih node pada tree untuk memfilter artikel tanpa kehilangan struktur.</p>}</aside>
        </div>
      </section>
    </div>
  );
}
