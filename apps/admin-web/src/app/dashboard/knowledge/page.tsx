import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-lg max-w-lg w-full">
          <h1 className="text-3xl font-bold mb-4 text-red-400">403 Forbidden</h1>
          <p className="mb-6">You do not have the necessary permissions to manage Knowledge articles.</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const knowledgeRes = accessToken ? await getAdminKnowledge(accessToken) : null;

  return (
    <div className="admin-page">
      <div>
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Manajemen konten</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Pusat Pengetahuan</h1>
            <p className="mt-2 text-sm text-slate-500">Kelola artikel, revisi, dan workflow review.</p>
          </div>
          <Link 
            href="/dashboard/knowledge/create" 
            className="admin-button"
          >
            + Buat artikel
          </Link>
        </div>

        <div className="admin-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">Title</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Current / Published Rev</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!knowledgeRes || !knowledgeRes.data || knowledgeRes.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${article.status === 'published' ? 'bg-green-100 text-green-800' : 
                          article.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          article.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {article.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      Rev {article.current_revision_no} {article.published_revision_no ? `(Pub: ${article.published_revision_no})` : '(No Pub)'}
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/knowledge/${article.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium mr-4">
                        Edit / View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
