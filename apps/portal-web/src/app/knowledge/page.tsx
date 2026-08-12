import Link from "next/link";
import { EmptyState, ErrorState, formatDate, PageHero, Pagination, type PaginationData } from "@/components/public-content";

type Article = { id: string; slug: string; title: string; summary?: string; last_reviewed_at?: string };
type Result = { data: Article[]; pagination?: PaginationData; error?: true };

async function getKnowledge(page: number): Promise<Result> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return { data: [], error: true };
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/knowledge?page=${page}&page_size=9`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const knowledgeResponse = await getKnowledge(page);

  return (
    <div>
      {/* Techwind Inspired Header / Hero */}
      <PageHero eyebrow="Pusat Pengetahuan" title="Wawasan tepercaya untuk pekerjaan sehari-hari" description="Temukan panduan, praktik terbaik, dan pengetahuan organisasi yang telah ditinjau sebelum dipublikasikan." />

      {/* Main Content */}
      <section className="portal-container py-12 sm:py-16">
        {knowledgeResponse.error ? <ErrorState title="Pusat Pengetahuan belum dapat dimuat" /> : knowledgeResponse.data.length === 0 ? (
          <EmptyState title="Belum ada artikel" description="Artikel pengetahuan yang telah disetujui dan diterbitkan akan tampil di sini." />
        ) : (
          <><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeResponse.data.map((article: Article) => (
              <article key={article.id} className="portal-card group flex min-h-72 flex-col p-6">
                <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">Panduan</span>
                <h2 className="mt-5 text-xl font-extrabold leading-7 text-slate-900"><Link href={`/knowledge/${article.slug}`} className="transition group-hover:text-teal-700">{article.title}</Link></h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary || "Buka artikel untuk membaca panduan selengkapnya."}</p>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500"><span>{article.last_reviewed_at ? `Ditinjau ${formatDate(article.last_reviewed_at)}` : "Konten terkurasi"}</span><span className="font-bold text-teal-700">Baca →</span></div>
              </article>
            ))}
          </div><Pagination pagination={knowledgeResponse.pagination} path="/knowledge" /></>
        )}
      </section>
    </div>
  );
}
