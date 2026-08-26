import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminPagination } from "@/components/admin-pagination";

async function getAdminNews(token: string, page: number, pageSize: number) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/news?${params}`, {
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

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ page?: string; page_size?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const requestedPageSize = Number.parseInt(params.page_size || "20", 10);
  const pageSize = [10, 20, 50].includes(requestedPageSize) ? requestedPageSize : 20;
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

  const newsRes = accessToken ? await getAdminNews(accessToken, page, pageSize) : null;
  const news = newsRes?.data || [];
  const pagination = newsRes?.pagination || { page, page_size: pageSize, total: news.length, total_pages: news.length ? 1 : 0 };
  if (pagination.total_pages > 0 && page > pagination.total_pages) redirect(`/dashboard/news?page=${pagination.total_pages}&page_size=${pageSize}`);
  if (pagination.total_pages > 0 && page > pagination.total_pages) redirect(`/dashboard/news?page=${pagination.total_pages}&page_size=${pageSize}`);

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen konten</p>
            <h1 className="admin-page-title">Berita</h1>
            <p className="admin-page-copy">Susun dan kelola alur kerja berita Teman Belajar.</p>
          </div>
          <Link 
            href="/dashboard/news/create" 
            className="admin-button"
          >
            <span aria-hidden="true">+</span> Buat berita
          </Link>
        </div>

        <AdminDataTable title="Daftar berita" description="Seluruh status editorial" itemCount={pagination.total} headers={["Judul", "Status", "Diterbitkan", "Aksi"]} emptyState="Belum ada berita. Buat draf pertama untuk memulai." error={newsRes ? null : "Data berita gagal dimuat."} retryHref="/dashboard/news">
              {news.map((news: any) => (
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
                      {news.published_at ? new Date(news.published_at).toLocaleDateString("id-ID") : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/news/${news.id}`} className="mr-4 font-bold text-sky-700 hover:text-sky-600">
                        Buka detail →
                      </Link>
                    </td>
                  </tr>
                ))}
        </AdminDataTable>
        <AdminPagination page={pagination.page} pages={pagination.total_pages} total={pagination.total} pageSize={pagination.page_size} pathname="/dashboard/news" />
      </div>
    </div>
  );
}

