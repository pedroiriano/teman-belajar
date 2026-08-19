import { getServerAccessToken } from "@/lib/server-auth";
import { StatisticsFilter } from "@/components/statistics-filter";
import { Suspense } from "react";
import type { StatisticsResponse, PageDaily, LearningDaily, SSODaily, APIStats, PromValue, CourseUtilization } from "@/types/analytics";

export const metadata = {
  title: "Statistik - Teman Belajar",
};

async function fetchStats(token: string, days: string = "30"): Promise<{ data?: StatisticsResponse; error?: boolean }> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://localhost:8080";
  const res = await fetch(`${API_BASE}/api/v1/internal/analytics/statistics?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { error: true };
  return { data: (await res.json()) as StatisticsResponse };
}

function renderPromValue(val: PromValue, format: "number" | "ms" | "percent" = "number") {
  if (!val || !val.available) return "Tidak tersedia";
  if (!val.value) return "0";
  const num = parseFloat(val.value);
  if (isNaN(num)) return "0";
  if (format === "ms") return `${(num * 1000).toFixed(0)} ms`;
  if (format === "percent") return `${num.toFixed(2)} %`;
  return num.toFixed(2);
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const token = await getServerAccessToken();
  if (!token) return <div className="admin-page-container">Unauthorized</div>;

  const daysParam = typeof resolvedParams.days === "string" ? resolvedParams.days : "30";
  const daysLabel = daysParam === "1" ? "1 Hari" : daysParam === "7" ? "7 Hari" : daysParam === "30" ? "30 Hari" : daysParam === "90" ? "3 Bulan" : daysParam === "180" ? "6 Bulan" : daysParam === "365" ? "1 Tahun" : `${daysParam} Hari`;

  const res = await fetchStats(token, daysParam);
  
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

  const data: StatisticsResponse = res.data;
  const { page_views, learning, sso, api, period_unique_visitors, freshness } = data;

  const totalPageViews = page_views?.reduce((acc: number, curr: PageDaily) => acc + curr.views, 0) || 0;
  
  const totalActiveLearners = learning?.reduce((acc: number, curr: LearningDaily) => acc + curr.active_learners, 0) || 0;
  const totalCompletions = learning?.reduce((acc: number, curr: LearningDaily) => acc + curr.completions, 0) || 0;
  
  const mostRecentLearning = learning?.length > 0 ? learning[0] : null;

  return (
    <div className="admin-page-container">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="admin-page-title">Statistik Platform</h1>
          <p className="admin-page-copy">Pantau penggunaan platform dan aktivitas belajar secara keseluruhan.</p>
          {freshness && (
            <p className="text-xs text-slate-500 mt-2">
              Data Historis Terakhir: {new Date(freshness.analytics_last_rollup).toLocaleString('id-ID')} |
              Sistem Realtime Terakhir: {new Date(freshness.prometheus_observed_at).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"></div>}>
          <StatisticsFilter />
        </Suspense>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-card p-6">
          <p className="text-sm font-semibold text-slate-500">Total Page Views</p>
          <p className="mt-2 text-3xl font-bold">{totalPageViews.toLocaleString()}</p>
        </div>
        <div className="admin-card p-6">
          <p className="text-sm font-semibold text-slate-500">Unique Visitors (Periode)</p>
          <p className="mt-2 text-3xl font-bold">{period_unique_visitors >= 0 ? period_unique_visitors.toLocaleString() : "Tidak Tersedia (>30 Hari)"}</p>
        </div>
        <div className="admin-card p-6">
          <p className="text-sm font-semibold text-slate-500">Pembelajar Aktif</p>
          <p className="mt-2 text-3xl font-bold">{totalActiveLearners.toLocaleString()}</p>
        </div>
        <div className="admin-card p-6">
          <p className="text-sm font-semibold text-slate-500">Penyelesaian Kursus</p>
          <p className="mt-2 text-3xl font-bold">{totalCompletions.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kunjungan Halaman ({daysLabel} Terakhir)</h2>
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
                  page_views.map((pv: PageDaily, i: number) => {
                    const maxViews = Math.max(...page_views.map((p: PageDaily) => p.views));
                    const percentage = maxViews > 0 ? (pv.views / maxViews) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">{new Date(pv.date).toLocaleDateString()}</td>
                        <td className="p-4 font-medium truncate max-w-[200px]" title={pv.path}>{pv.path}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-8">{pv.views}</span>
                            <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{pv.unique_visitors}</td>
                      </tr>
                    );
                  })
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
                  <th className="p-4 font-semibold">Start / Completion</th>
                  <th className="p-4 font-semibold">Tingkat Penyelesaian</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {learning?.length > 0 ? (
                  learning.map((l: LearningDaily, i: number) => {
                    const maxActive = Math.max(...learning.map((x: LearningDaily) => x.active_learners));
                    const percentage = maxActive > 0 ? (l.active_learners / maxActive) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">{new Date(l.date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-8">{l.active_learners}</span>
                            <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-teal-500" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{l.learning_starts} / {l.completions}</td>
                        <td className="p-4 font-medium">{l.completion_rate}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {mostRecentLearning && mostRecentLearning.top_courses && mostRecentLearning.top_courses.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Top Kursus Populer (Moodle Terkini)</h2>
            <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="p-4 font-semibold">ID Kursus</th>
                    <th className="p-4 font-semibold">Nama Kursus</th>
                    <th className="p-4 font-semibold">Akses</th>
                    <th className="p-4 font-semibold">Learner Unik</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {mostRecentLearning.top_courses.map((c: CourseUtilization, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-4">{c.course_id}</td>
                      <td className="p-4 font-medium">{c.course_name}</td>
                      <td className="p-4">{c.accesses}</td>
                      <td className="p-4">{c.unique_learners}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivitas SSO & Keamanan</h2>
          <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th colSpan={2} className="p-4 font-semibold">Status Login (Berhasil / Gagal)</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {sso?.length > 0 ? (
                  sso.map((s: SSODaily, i: number) => {
                    const total = s.successful_logins + s.failed_logins;
                    const successPct = total > 0 ? (s.successful_logins / total) * 100 : 0;
                    const failPct = total > 0 ? (s.failed_logins / total) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">{new Date(s.date).toLocaleDateString()}</td>
                        <td colSpan={2} className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-emerald-600">{s.successful_logins} Berhasil</span>
                              <span className="text-red-600">{s.failed_logins} Gagal</span>
                            </div>
                            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="bg-emerald-500" style={{ width: `${successPct}%` }} />
                              <div className="bg-red-500" style={{ width: `${failPct}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">Belum ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {api && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kesehatan API (Prometheus 5m Realtime)</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">Request Rate</p>
                <p className="mt-2 text-3xl font-bold">{renderPromValue(api.request_rate)} /s</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">Error Rate</p>
                <p className="mt-2 text-3xl font-bold">{renderPromValue(api.error_rate, "percent")}</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">p95 Latency</p>
                <p className="mt-2 text-3xl font-bold">{renderPromValue(api.p95_latency, "ms")}</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">p99 Latency</p>
                <p className="mt-2 text-3xl font-bold">{renderPromValue(api.p99_latency, "ms")}</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">2xx (OK)</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">{renderPromValue(api.status_2xx)} /s</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">4xx (Client Error)</p>
                <p className="mt-2 text-2xl font-bold text-orange-600">{renderPromValue(api.status_4xx)} /s</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">5xx (Server Error)</p>
                <p className="mt-2 text-2xl font-bold text-red-600">{renderPromValue(api.status_5xx)} /s</p>
              </div>
              <div className="admin-card p-6">
                <p className="text-sm font-semibold text-slate-500">p50 Latency (Median)</p>
                <p className="mt-2 text-2xl font-bold text-slate-600">{renderPromValue(api.p50_latency, "ms")}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
