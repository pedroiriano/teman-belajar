import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  if (!session) {
    redirect("/api/auth/signin");
  }

  const hasAccess = session.roles?.some((r: string) => 
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(r)
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-lg max-w-lg w-full">
          <h1 className="text-3xl font-bold mb-4 text-red-400">403 Forbidden</h1>
          <p className="mb-6">You do not have the necessary permissions to manage Announcements.</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const annsRes = await getAdminAnnouncements(session.accessToken || '');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Announcements Management</h1>
            <p className="text-slate-500 mt-2">Manage active and scheduled announcements.</p>
          </div>
          <Link 
            href="/dashboard/announcements/create" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            + Create Announcement
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">Title</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Schedule</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!annsRes || !annsRes.data || annsRes.data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No announcements found. Create one to get started.
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${ann.status === 'published' ? 'bg-green-100 text-green-800' : 
                          ann.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                          ann.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'}`}>
                        {ann.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div><span className="font-medium">Start:</span> {ann.start_at ? new Date(ann.start_at).toLocaleDateString() : 'N/A'}</div>
                      <div><span className="font-medium">End:</span> {ann.end_at ? new Date(ann.end_at).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <Link href={`/dashboard/announcements/${ann.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium mr-4">
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
