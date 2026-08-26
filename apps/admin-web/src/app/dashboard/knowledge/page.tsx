import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";

async function getAdminKnowledge(token: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge`, {
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

export default async function AdminKnowledgePage() {
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

  const knowledgeRes = accessToken ? await getAdminKnowledge(accessToken) : null;

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen konten</p><h1 className="admin-page-title">Pusat Pengetahuan</h1><p className="admin-page-copy">Kelola artikel, revisi, dan workflow review.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/dashboard/knowledge-hierarchy" className="admin-button-secondary">Kelola struktur</Link><Link
              href="/dashboard/knowledge/create"
              className="admin-button"
            >
              <span aria-hidden="true">+</span> Buat artikel
            </Link></div>
        </div>

        <div className="admin-table-shell"><div className="admin-table-toolbar"><div><h2 className="font-black text-slate-900">Daftar artikel</h2><p className="mt-1 text-xs text-slate-500">Versi dan status publikasi</p></div><span className="admin-status bg-slate-100 text-slate-600">{knowledgeRes?.data?.length || 0} item</span></div><div className="overflow-x-auto"><table className="admin-table">
            <thead>
              <tr><th>Judul</th><th>Status</th><th>Revisi aktif / terbit</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!knowledgeRes || !knowledgeRes.data || knowledgeRes.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-empty">
                    Belum ada artikel pengetahuan. Buat draft pertama untuk memulai.
                  </td>
                </tr>
              ) : (
                knowledgeRes.data.map((article: any) => (
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
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}

