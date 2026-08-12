import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function getNews() {
  // Use absolute URL since this runs on the server
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");
  
  const res = await fetch(`${API_BASE}/api/v1/news?page=1&page_size=20`, {
    next: { revalidate: 60 } // Revalidate every 60 seconds
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export default async function NewsPage() {
  const session = await getServerSession(authOptions);
  const newsResponse = await getNews();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Techwind Inspired Header / Hero */}
      <section className="bg-indigo-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Berita Terbaru</h1>
          <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
            Temukan berita, pembaruan, dan wawasan terbaru dari Teman Belajar.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-6">
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            &larr; Kembali ke Beranda
          </Link>
        </div>

        {!newsResponse || !newsResponse.data || newsResponse.data.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Belum ada berita</h3>
            <p className="text-gray-500">Berita yang diterbitkan akan muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsResponse.data.map((news: any) => (
              <div key={news.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="text-sm text-indigo-600 font-semibold mb-2">
                    {new Date(news.published_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    <Link href={`/news/${news.slug}`} className="hover:text-indigo-600 transition-colors">
                      {news.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 line-clamp-3">
                    {news.excerpt}
                  </p>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 mt-auto">
                  <Link href={`/news/${news.slug}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
                    Baca selengkapnya
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
