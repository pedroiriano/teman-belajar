import Link from "next/link";
import { ErrorState, PageHero } from "@/components/public-content";

export const metadata = { title: "Hasil Pencarian" };

type SearchDocument = {
	id:          string
	type:        string
	title:       string
	description: string
	url:         string
	image_url?:  string
	tags?:       string[]
}

type SearchResponse = {
	data?: {
		hits: SearchDocument[]
		total_hits: number
		limit: number
		offset: number
		processing_time_ms: number
	}
	error?: boolean
}

async function doSearch(q: string, type: string): Promise<SearchResponse> {
  if (!q) return { data: { hits: [], total_hits: 0, limit: 10, offset: 0, processing_time_ms: 0 } };

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return { error: true };
  
  try {
    const query = new URLSearchParams({ q });
    if (type && type !== "all") query.append("type", type);
    
    const res = await fetch(`${API_BASE}/api/v1/search?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) return { error: true };
    const payload = await res.json();
    return payload;
  } catch {
    return { error: true };
  }
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    course: { label: "Kelas", bg: "bg-blue-50", text: "text-blue-700" },
    knowledge: { label: "Panduan", bg: "bg-teal-50", text: "text-teal-700" },
    news: { label: "Berita", bg: "bg-orange-50", text: "text-orange-700" },
    announcement: { label: "Pengumuman", bg: "bg-purple-50", text: "text-purple-700" },
  };
  const config = map[type] || { label: type, bg: "bg-slate-100", text: "text-slate-700" };
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.text}`}>{config.label}</span>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const query = await searchParams;
  const q = query.q || "";
  const type = query.type || "all";
  
  const response = await doSearch(q, type);

  return (
    <div>
      <PageHero eyebrow="Pencarian Terpadu" title={`Hasil untuk "${q}"`} description="Mencari kelas, artikel pengetahuan, pengumuman, dan berita di seluruh platform." />

      <section className="portal-container py-12 sm:py-16">
        <div className="mb-8 flex flex-wrap gap-2">
          {["all", "course", "knowledge", "news", "announcement"].map((t) => (
            <Link 
              key={t}
              href={`/search?q=${encodeURIComponent(q)}&type=${t}`}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${type === t ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {t === "all" ? "Semua" : t === "course" ? "Kelas" : t === "knowledge" ? "Panduan" : t === "news" ? "Berita" : "Pengumuman"}
            </Link>
          ))}
        </div>

        {response.error ? (
          <ErrorState title="Pencarian tidak tersedia" />
        ) : !q ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Masukkan kata kunci</h3>
            <p className="mt-2 text-sm text-slate-500">Ketik di kotak pencarian untuk mulai mencari materi.</p>
          </div>
        ) : response.data?.hits.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Tidak ada hasil</h3>
            <p className="mt-2 text-sm text-slate-500">Coba gunakan kata kunci lain atau periksa ejaan Anda.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {response.data?.hits.map((doc) => (
              <article key={doc.id} className="portal-card group flex min-h-64 flex-col p-6">
                <TypeBadge type={doc.type} />
                <h2 className="mt-5 text-lg font-extrabold leading-6 text-slate-900">
                  <Link href={doc.url} className="transition group-hover:text-teal-700 line-clamp-2" dangerouslySetInnerHTML={{ __html: doc.title }} />
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600" dangerouslySetInnerHTML={{ __html: doc.description }} />
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500">
                  <span className="font-bold text-teal-700 group-hover:underline">Kunjungi →</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
