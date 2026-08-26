import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminPagination } from "@/components/admin-pagination";

async function getAdminKnowledge(token: string, page: number, pageSize: number) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge?${params}`, {
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

export default async function AdminKnowledgePage({ searchParams }: { searchParams: Promise<{ page?: string; page_size?: string }> }) {
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
    return <AdminUnauthorized resource="artikel pengetahuan" />;
  }

  const knowledgeRes = accessToken ? await getAdminKnowledge(accessToken, page, pageSize) : null;
  const articles = knowledgeRes?.data || [];
  const pagination = knowledgeRes?.pagination || { page, page_size: pageSize, total: articles.length, total_pages: articles.length ? 1 : 0 };
  if (pagination.total_pages > 0 && page > pagination.total_pages) redirect(`/dashboard/knowledge?page=${pagination.total_pages}&page_size=${pageSize}`);

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen konten</p><h1 className="admin-page-title">Pusat Pengetahuan</h1><p className="admin-page-copy">Kelola artikel, revisi, dan alur kerja peninjauan.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/dashboard/knowledge-hierarchy" className="admin-button-secondary">Kelola struktur</Link><Link
              href="/dashboard/knowledge/create"
              className="admin-button"
            >
              <span aria-hidden="true">+</span> Buat artikel
            </Link></div>
        </div>

        <AdminDataTable title="Daftar artikel" description="Versi dan status publikasi" itemCount={pagination.total} headers={["Judul", "Status", "Revisi aktif / terbit", "Aksi"]} emptyState="Belum ada artikel pengetahuan. Buat draf pertama untuk memulai." error={knowledgeRes ? null : "Data artikel gagal dimuat."} retryHref="/dashboard/knowledge">
              {articles.map((article: any) => (
                  <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{article.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{article.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`admin-status
                        ${article.status === 'published' ? 'bg-green-100 text-green-800' : 
                          article.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          article.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {({ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan', approved: 'Disetujui', rejected: 'Ditolak' } as Record<string, string>)[article.status] || article.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      Revisi {article.current_revision_no} {article.published_revision_no ? `(Terbit: ${article.published_revision_no})` : '(Belum terbit)'}
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/knowledge/${article.id}`} className="mr-4 font-bold text-sky-700 hover:text-sky-600">
                        Buka detail →
                      </Link>
                    </td>
                  </tr>
                ))}
        </AdminDataTable>
        <AdminPagination page={pagination.page} pages={pagination.total_pages} total={pagination.total} pageSize={pagination.page_size} pathname="/dashboard/knowledge" />
      </div>
    </div>
  );
}

