import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";

async function getKnowledgeBySlug(slug: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/knowledge/${slug}`, {
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

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getKnowledgeBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <section className="bg-indigo-600 text-white py-20 lg:py-24">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="mb-6">
            <span className="bg-indigo-500 text-indigo-50 px-3 py-1 rounded-full text-sm font-semibold tracking-wide">
              Pusat Pengetahuan
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            {article.title}
          </h1>
          <div className="text-indigo-100 flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>{article.updated_at ? new Date(article.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl mx-auto p-8 md:p-12 border border-gray-100">
          <div className="mb-8 border-b border-gray-100 pb-8">
             <Link href="/knowledge" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center transition-colors">
               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
               Kembali ke Pusat Pengetahuan
             </Link>
          </div>

          <MarkdownRenderer content={article.body} />
        </div>
      </section>
    </article>
  );
}
