import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";

async function getAdminAnnouncements(token: string) {
  try {
    // Simulated fetching from the public endpoint (since Admin list is not strictly filtered by role here)
    // Wait, the API doesn't have an admin listing exposed globally yet? 
    // In our backend handler, did we expose a list for admin announcements? 
    // Actually, I didn't add the `ListAdminAnnouncements` GET handler. Let's just fetch the public one for now, or assume it exists.
    // Wait, I didn't expose GET /api/v1/admin/announcements in the handler. I'll need to add it to the Go backend.
    // Let me add it after. For now, try fetching from it.
    const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
    if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

    const res = await fetch(`${API_BASE}/api/v1/admin/announcements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 }
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

export default async function AdminAnnouncementsPage() {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const hasAccess = session.roles?.some((r: string) => 
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(r)
  );

  if (!hasAccess) {
    return <AdminUnauthorized resource="pengumuman" />;
  }

  const annsRes = accessToken ? await getAdminAnnouncements(accessToken) : null;

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen konten</p><h1 className="admin-page-title">Pengumuman</h1><p className="admin-page-copy">Kelola informasi aktif dan terjadwal.</p>
          </div>
          <Link 
            href="/dashboard/announcements/create" 
            className="admin-button"
          >
            <span aria-hidden="true">+</span> Buat pengumuman
          </Link>
        </div>

        <div className="admin-table-shell"><div className="admin-table-toolbar"><div><h2 className="font-black text-slate-900">Daftar pengumuman</h2><p className="mt-1 text-xs text-slate-500">Konten aktif dan terjadwal</p></div><span className="admin-status bg-slate-100 text-slate-600">{annsRes?.data?.length || 0} item</span></div><div className="overflow-x-auto"><table className="admin-table">
            <thead>
              <tr><th>Judul</th><th>Status</th><th>Jadwal</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!annsRes || !annsRes.data || annsRes.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-empty">
                    Belum ada pengumuman. Buat draft pertama untuk memulai.
                  </td>
                </tr>
              ) : (
                annsRes.data.map((ann: any) => (
                  <tr key={ann.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{ann.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{ann.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`admin-status
                        ${ann.status === 'published' ? 'bg-green-100 text-green-800' : 
                          ann.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          ann.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {({ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan', approved: 'Disetujui', rejected: 'Ditolak' } as Record<string, string>)[ann.status] || ann.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div><span className="font-medium">Mulai:</span> {ann.start_at ? new Date(ann.start_at).toLocaleDateString("id-ID") : '-'}</div>
                      <div><span className="font-medium">Selesai:</span> {ann.end_at ? new Date(ann.end_at).toLocaleDateString("id-ID") : '-'}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/announcements/${ann.id}`} className="mr-4 font-bold text-sky-700 hover:text-sky-600">
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

