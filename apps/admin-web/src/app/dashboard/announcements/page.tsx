import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminPagination } from "@/components/admin-pagination";

async function getAdminAnnouncements(token: string, page: number, pageSize: number) {
  try {
    const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
    if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/announcements?${params}`, {
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

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<{ page?: string; page_size?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const requestedPageSize = Number.parseInt(params.page_size || "20", 10);
  const pageSize = [10, 20, 50].includes(requestedPageSize) ? requestedPageSize : 20;
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

  const annsRes = accessToken ? await getAdminAnnouncements(accessToken, page, pageSize) : null;
  const announcements = annsRes?.data || [];
  const pagination = annsRes?.pagination || { page, page_size: pageSize, total: announcements.length, total_pages: announcements.length ? 1 : 0 };
  if (pagination.total_pages > 0 && page > pagination.total_pages) redirect(`/dashboard/announcements?page=${pagination.total_pages}&page_size=${pageSize}`);

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

        <AdminDataTable title="Daftar pengumuman" description="Konten aktif dan terjadwal" itemCount={pagination.total} headers={["Judul", "Status", "Jadwal", "Aksi"]} emptyState="Belum ada pengumuman. Buat draf pertama untuk memulai." error={annsRes ? null : "Data pengumuman gagal dimuat."} retryHref="/dashboard/announcements">
              {announcements.map((ann: any) => (
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
                ))}
        </AdminDataTable>
        <AdminPagination page={pagination.page} pages={pagination.total_pages} total={pagination.total} pageSize={pagination.page_size} pathname="/dashboard/announcements" />
      </div>
    </div>
  );
}

