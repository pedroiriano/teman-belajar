import { Suspense, type ReactNode } from "react";
import { getServerAccessToken } from "@/lib/server-auth";
import { StatisticsFilter } from "@/components/statistics-filter";
import type { ContentDaily, PageDaily, PromValue, SearchDaily, SourceState, StatisticsResponse } from "@/types/analytics";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function fetchStats(token: string, days: string) {
  const res = await fetch(`${API_BASE}/api/v1/admin/analytics/statistics?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as StatisticsResponse;
}

function number(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function percent(value: number) {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

function renderPromValue(value: PromValue, format: "number" | "ms" | "percent" = "number") {
  if (!value.available || value.value === null) return value.reason === "no_data" ? "Belum ada seri" : "Tidak tersedia";
  if (format === "ms") return `${(value.value * 1000).toFixed(0)} ms`;
  if (format === "percent") return percent(value.value);
  return value.value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function SourceBadge({ label, source }: { label: string; source: SourceState }) {
  const style = source.status === "fresh"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : source.status === "stale"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  const detail = source.observed_at ? new Date(source.observed_at).toLocaleString("id-ID") : source.reason || "Belum ada bukti keberhasilan";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
      <div><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p><p className="mt-0.5 text-[11px] text-slate-500" title={detail}>{detail}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${style}`}>{source.status}</span>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="admin-card p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></article>;
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-24 space-y-4"><div><h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</section>;
}

function DataTable({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="admin-card overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-5 py-4 font-black">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{empty ? <tr><td colSpan={headers.length} className="px-5 py-10 text-center text-slate-500">Belum ada data untuk rentang ini.</td></tr> : children}</tbody></table></div></div>
  );
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = await getServerAccessToken();
  if (!token) return <div className="admin-page">Sesi tidak memiliki akses statistik.</div>;

  const days = typeof params.days === "string" && ["1", "7", "30", "90", "180", "365"].includes(params.days) ? params.days : "30";
  const data = await fetchStats(token, days);
  if (!data) return <div className="admin-page"><div className="admin-card p-8 text-center text-rose-600">Statistik tidak dapat dimuat. Periksa API dan status sumber data.</div></div>;

  const totalPageViews = data.page_views?.reduce((sum, row) => sum + row.views, 0) || 0;
  const totalSearches = data.search?.reduce((sum, row) => sum + row.total_searches, 0) || 0;
  const zeroResults = data.search?.reduce((sum, row) => sum + row.zero_results, 0) || 0;
  const searchClicks = data.search?.reduce((sum, row) => sum + row.result_clicks, 0) || 0;
  const searchSuccessRate = totalSearches > 0 ? ((totalSearches - zeroResults) / totalSearches) * 100 : 0;
  const searchClickRate = totalSearches > 0 ? (searchClicks / totalSearches) * 100 : 0;
  const periodLearner = data.learning_period;
  const visitors = data.period_unique_visitors.available && data.period_unique_visitors.value !== null
    ? number(data.period_unique_visitors.value)
    : data.period_unique_visitors.reason === "retention_limit" ? "Tidak tersedia >30 hari" : "Tidak tersedia";
  const content = [...(data.content || [])].sort((a, b) => b.views - a.views);
  const nav = [["ringkasan", "Ringkasan"], ["traffic", "Pengunjung & Halaman"], ["content", "Konten"], ["learning", "Pembelajaran"], ["api", "API"], ["search", "Pencarian & Engagement"], ["auth", "Autentikasi"]];

  return (
    <div className="admin-page space-y-10">
      <header className="admin-page-header"><div><p className="admin-kicker">ANALYTICS & OBSERVABILITY</p><h1 className="admin-page-title">Statistik Platform</h1><p className="admin-page-copy">Statistik produk yang terkurasi; dashboard infrastruktur tetap terpisah dari UI produk.</p></div><Suspense fallback={<div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />}><StatisticsFilter /></Suspense></header>
      <nav aria-label="Bagian statistik" className="admin-card flex gap-2 overflow-x-auto p-2">{nav.map(([href, label]) => <a key={href} href={`#${href}`} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{label}</a>)}</nav>

      <Section id="ringkasan" title="Ringkasan" description={`Snapshot terpilih untuk ${days} hari terakhir.`}>
        <div className="grid gap-3 lg:grid-cols-3"><SourceBadge label="Analytics Worker" source={data.sources.analytics} /><SourceBadge label="Moodle" source={data.sources.moodle} /><SourceBadge label="Prometheus" source={data.sources.prometheus} /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Portal Page Views" value={number(totalPageViews)} note="Hanya portal.page_view; konten dan Admin tidak digandakan." /><StatCard label="Pengunjung Unik" value={visitors} note="Distinct visitor Portal; presisi dibatasi retensi 30 hari." /><StatCard label="Pembelajar Aktif" value={periodLearner ? number(periodLearner.active_learners) : "Tidak tersedia"} note="Distinct genuine learner dari Moodle untuk seluruh periode." /><StatCard label="Completion Rate" value={periodLearner ? percent(periodLearner.completion_rate) : "Tidak tersedia"} note="Completed eligible enrolments dibagi cohort eligible yang sama." /></div>
      </Section>

      <Section id="traffic" title="Pengunjung & Halaman" description="Traffic Portal publik tanpa event Admin atau event konten sekunder."><DataTable headers={["Tanggal", "Path", "Views", "Unique Visitors Harian"]} empty={!data.page_views?.length}>{data.page_views?.map((row: PageDaily) => <tr key={`${row.date}:${row.path}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-5 py-4">{row.date}</td><td className="max-w-xs truncate px-5 py-4 font-semibold" title={row.path}>{row.path}</td><td className="px-5 py-4">{number(row.views)}</td><td className="px-5 py-4">{number(row.unique_visitors)}</td></tr>)}</DataTable></Section>

      <Section id="content" title="Konten" description="content.viewed dikelompokkan ketat menurut tipe dan target; unique visitors ditampilkan per hari."><DataTable headers={["Tanggal", "Jenis", "Target", "Views", "Unique Visitors Harian"]} empty={!content.length}>{content.slice(0, 50).map((row: ContentDaily) => <tr key={`${row.date}:${row.content_type}:${row.target_id}`}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 capitalize">{row.content_type}</td><td className="max-w-xs truncate px-5 py-4 font-semibold" title={row.target_id}>{row.target_id}</td><td className="px-5 py-4">{number(row.views)}</td><td className="px-5 py-4">{number(row.unique_visitors)}</td></tr>)}</DataTable></Section>

      <Section id="learning" title="Pembelajaran" description="Cohort formal Moodle; staf, guest, site admin, akun nonaktif, dan pengguna tanpa role learner tidak dihitung.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Active Learners" value={periodLearner ? number(periodLearner.active_learners) : "Tidak tersedia"} note="Distinct learner dalam rentang terpilih." /><StatCard label="Learning Starts" value={periodLearner ? number(periodLearner.learning_starts) : "Tidak tersedia"} note="Aktivitas mulai pada cohort terpilih." /><StatCard label="Eligible Enrolments" value={periodLearner ? number(periodLearner.eligible_enrolments) : "Tidak tersedia"} note="Denominator completion rate." /><StatCard label="Completed" value={periodLearner ? number(periodLearner.completions) : "Tidak tersedia"} note="Enrolment eligible selesai sampai akhir periode." /></div>
        <DataTable headers={["Kursus", "Akses", "Learner Unik"]} empty={!periodLearner?.top_courses?.length}>{periodLearner?.top_courses.map((course) => <tr key={course.course_id}><td className="px-5 py-4 font-semibold">{course.course_name}</td><td className="px-5 py-4">{number(course.accesses)}</td><td className="px-5 py-4">{number(course.unique_learners)}</td></tr>)}</DataTable>
      </Section>

      <Section id="api" title="API" description="Sinyal Prometheus; nol, no-series, invalid, dan unavailable memiliki state berbeda.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Request Rate" value={`${renderPromValue(data.api.request_rate)} /s`} note="Rata-rata 5 menit." /><StatCard label="Availability" value={renderPromValue(data.api.availability, "percent")} note="up API selama 5 menit." /><StatCard label="Error Rate" value={renderPromValue(data.api.error_rate, "percent")} note="Proporsi respons 5xx." /><StatCard label="p95 Latency" value={renderPromValue(data.api.p95_latency, "ms")} note="Persentil ke-95." /><StatCard label="p99 Latency" value={renderPromValue(data.api.p99_latency, "ms")} note="Persentil ke-99." /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="2xx" value={renderPromValue(data.api.status_2xx)} note="Respons sukses per detik." /><StatCard label="3xx" value={renderPromValue(data.api.status_3xx)} note="Redirect per detik." /><StatCard label="4xx" value={renderPromValue(data.api.status_4xx)} note="Client error per detik." /><StatCard label="5xx" value={renderPromValue(data.api.status_5xx)} note="Server error per detik." /><StatCard label="p50" value={renderPromValue(data.api.p50_latency, "ms")} note="Median latency." /></div>
      </Section>

      <Section id="search" title="Pencarian & Engagement" description="Search tanpa raw query; engagement diberi label current/all-time state.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total Searches" value={number(totalSearches)} note="search.executed dalam periode." /><StatCard label="Zero Results" value={number(zeroResults)} note="search.zero_result dalam periode." /><StatCard label="Search Success" value={percent(searchSuccessRate)} note="(Search - zero result) / search." /><StatCard label="Result Click Rate" value={percent(searchClickRate)} note="Result clicks / total searches." /></div>
        <DataTable headers={["Tanggal", "Search", "Zero Result", "Result Click"]} empty={!data.search?.length}>{data.search?.map((row: SearchDaily) => <tr key={row.date}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4">{number(row.total_searches)}</td><td className="px-5 py-4">{number(row.zero_results)}</td><td className="px-5 py-4">{number(row.result_clicks)}</td></tr>)}</DataTable>
        <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Bookmarks" value={data.engagement ? number(data.engagement.bookmarks) : "Tidak tersedia"} note="Current/all-time state, bukan rentang tanggal." /><StatCard label="Ratings" value={data.engagement ? number(data.engagement.ratings) : "Tidak tersedia"} note="Current/all-time state, bukan rentang tanggal." /><StatCard label="Average Rating" value={data.engagement ? data.engagement.avg_rating.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "Tidak tersedia"} note="Rata-rata rating aktif saat ini." /></div>
      </Section>

      <Section id="auth" title="Autentikasi" description="Hanya auth.login dengan result success atau failure yang valid."><DataTable headers={["Tanggal", "Login Berhasil", "Login Gagal"]} empty={!data.sso?.length}>{data.sso?.map((row) => <tr key={row.date}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 text-emerald-600">{number(row.successful_logins)}</td><td className="px-5 py-4 text-rose-600">{number(row.failed_logins)}</td></tr>)}</DataTable></Section>
    </div>
  );
}
