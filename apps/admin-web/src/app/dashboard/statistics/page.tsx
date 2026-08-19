import { getServerAccessToken } from "@/lib/server-auth";

export const metadata = {
  title: "Statistik - Teman Belajar",
};

async function fetchStats(token: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://localhost:8080";
  const res = await fetch(`${API_BASE}/api/v1/admin/analytics/statistics`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { error: true };
  return { data: await res.json() };
}

export default async function StatisticsPage() {
  const token = await getServerAccessToken();
  if (!token) return <div className="admin-page-container">Unauthorized</div>;

  const res = await fetchStats(token);
  
  if (res.error || !res.data) {
    return (
      <div className="admin-page-container">
        <h1 className="admin-page-title">Statistik Platform</h1>
        <div className="admin-card mt-8 p-8 text-center text-red-500">
          Gagal memuat statistik. Pastikan API analytics berjalan.
        </div>
      </div>
    );
  }

  const { page_views, learning, sso } = res.data as any;

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Analytics & Insight</p>
          <h1 className="admin-page-title">Statistik Platform</h1>
          <p className="admin-page-copy">Pantau penggunaan platform dan aktivitas belajar secara keseluruhan.</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kunjungan Halaman (30 Hari Terakhir)</h2>
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">URL</th>
                  <th className="p-4 font-semibold">Views</th>
                  <th className="p-4 font-semibold">Unique Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {page_views?.length > 0 ? (
                  page_views.map((pv: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">{new Date(pv.date).toLocaleDateString()}</td>
                      <td className="p-4 font-medium">{pv.path}</td>
                      <td className="p-4">{pv.views}</td>
                      <td className="p-4">{pv.unique_visitors}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivitas Belajar (Moodle)</h2>
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Learner Aktif</th>
                  <th className="p-4 font-semibold">Penyelesaian Kursus</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {learning?.length > 0 ? (
                  learning.map((l: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="p-4">{l.active_learners}</td>
                      <td className="p-4">{l.completions}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivitas SSO</h2>
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Berhasil</th>
                  <th className="p-4 font-semibold">Gagal</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {sso?.length > 0 ? (
                  sso.map((s: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="p-4 text-emerald-600">{s.successful_logins}</td>
                      <td className="p-4 text-red-600">{s.failed_logins}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

