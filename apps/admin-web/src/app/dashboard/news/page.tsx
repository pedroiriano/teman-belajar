import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";

async function getAdminNews(token: string) {
  // In a real implementation we would fetch /api/v1/admin/news 
  // with the Authorization: Bearer ${token} header.
  // For the sake of this vertical slice, we will simulate the fetch 
  // or use the public endpoint as a fallback if the admin API requires deeper BFF setup.
  
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/news`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 } // no cache for admin
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

export default async function AdminNewsPage() {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Allow Portal Administrator, Content Editor, or Reviewer
  const hasAccess = session.roles?.some((r: string) => 
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(r)
  );

  if (!hasAccess) {
    return <AdminUnauthorized resource="berita" />;
  }

  const newsRes = accessToken ? await getAdminNews(accessToken) : null;

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen konten</p>
            <h1 className="admin-page-title">Berita</h1>
            <p className="admin-page-copy">Susun dan kelola workflow berita Teman Belajar.</p>
          </div>
          <Link 
            href="/dashboard/news/create" 
            className="admin-button"
          >
            <span aria-hidden="true">+</span> Buat berita
          </Link>
        </div>

        <div className="admin-table-shell">
          <div className="admin-table-toolbar"><div><h2 className="font-black text-slate-900">Daftar berita</h2><p className="mt-1 text-xs text-slate-500">Seluruh status editorial</p></div><span className="admin-status bg-slate-100 text-slate-600">{newsRes?.data?.length || 0} item</span></div>
          <div className="overflow-x-auto"><table className="admin-table">
            <thead>
              <tr>
                <th>Judul</th><th>Status</th><th>Dipublikasikan</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!newsRes || !newsRes.data || newsRes.data.length === 0 ? (
                <tr>
                    <td colSpan={4} className="admin-empty">
                    Belum ada berita. Buat draft pertama untuk memulai.
                  </td>
                </tr>
              ) : (
                newsRes.data.map((news: any) => (
                  <tr key={news.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{news.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{news.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`admin-status
                        ${news.status === 'published' ? 'bg-green-100 text-green-800' : 
                          news.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          news.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {({ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan', approved: 'Disetujui', rejected: 'Ditolak' } as Record<string, string>)[news.status] || news.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {news.published_at ? new Date(news.published_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/news/${news.id}`} className="mr-4 font-bold text-sky-700 hover:text-sky-600">
                        Buka detail →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}

