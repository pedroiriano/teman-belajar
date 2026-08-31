import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
const CORRELATION_PATH = "/dashboard/statistics#api";

type HealthStatus = "healthy" | "degraded" | "down" | "unknown";
type DependencyHealth = {
  key: string;
  name: string;
  group: string;
  status: HealthStatus;
  checked_at: string;
  last_success_at?: string;
  freshness_seconds?: number;
  error_class?: string;
  correlation_path?: string;
};
type HealthSnapshot = {
  status: HealthStatus;
  checked_at: string;
  correlation_id: string;
  dependencies: DependencyHealth[];
};

const statusCopy: Record<HealthStatus, string> = {
  healthy: "Sehat",
  degraded: "Terdegradasi",
  down: "Tidak tersedia",
  unknown: "Belum diketahui",
};

const statusStyle: Record<HealthStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  degraded: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/15 dark:text-yellow-200",
  down: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  unknown: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

const groupCopy: Record<string, string> = {
  platform: "Platform",
  database: "Database",
  learning: "Pembelajaran",
  identity: "Identitas",
  search: "Pencarian",
  cache: "Cache",
  storage: "Penyimpanan",
  workers: "Worker",
  observability: "Observability",
};

async function fetchHealth(token: string): Promise<{ data?: HealthSnapshot; status: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/integration-health`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: response.status };
    return { data: await response.json() as HealthSnapshot, status: response.status };
  } catch {
    return { status: 503 };
  }
}

function formattedTime(value?: string) {
  if (!value) return "Belum pernah berhasil";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Waktu tidak valid" : timestamp.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function DependencyCard({ dependency }: { dependency: DependencyHealth }) {
  const correlationPath = dependency.correlation_path === CORRELATION_PATH ? correlationPathSafe(dependency.correlation_path) : null;
  return (
    <article className="admin-card flex h-full flex-col gap-4 p-5" aria-labelledby={`health-${dependency.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{groupCopy[dependency.group] || "Integrasi"}</p>
          <h3 id={`health-${dependency.key}`} className="mt-1 text-base font-black text-slate-900 dark:text-white">{dependency.name}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyle[dependency.status]}`}>
          <span className="sr-only">Status: </span>{statusCopy[dependency.status]}
        </span>
      </div>
      <dl className="mt-auto grid gap-2 text-xs">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Diperiksa</dt><dd className="text-right font-semibold text-slate-700 dark:text-slate-200"><time dateTime={dependency.checked_at}>{formattedTime(dependency.checked_at)}</time></dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Terakhir berhasil</dt><dd className="text-right font-semibold text-slate-700 dark:text-slate-200">{formattedTime(dependency.last_success_at)}</dd></div>
        {typeof dependency.freshness_seconds === "number" && <div className="flex justify-between gap-4"><dt className="text-slate-500">Freshness</dt><dd className="font-semibold text-slate-700 dark:text-slate-200">{dependency.freshness_seconds} detik</dd></div>}
        {dependency.error_class && <div className="flex justify-between gap-4"><dt className="text-slate-500">Kelas gangguan</dt><dd className="font-mono text-[11px] font-semibold text-rose-700 dark:text-rose-300">{dependency.error_class}</dd></div>}
      </dl>
      {correlationPath && <Link href={correlationPath} className="text-xs font-bold text-sky-700 hover:underline dark:text-sky-300">Lihat korelasi metrik API</Link>}
    </article>
  );
}

function correlationPathSafe(value: string) {
  return value === CORRELATION_PATH ? value : CORRELATION_PATH;
}

export default async function IntegrationHealthPage() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return <div className="admin-page"><div className="admin-card p-8" role="alert"><h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Akses ditolak</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Kesehatan integrasi hanya tersedia untuk Portal Administrator.</p></div></div>;
  }
  const token = await getServerAccessToken();
  if (!token) {
    return <div className="admin-page"><div className="admin-card p-8" role="alert"><h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Sesi tidak tersedia</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Login ulang untuk memuat kesehatan integrasi.</p></div></div>;
  }
  const result = await fetchHealth(token);
  if (!result.data) {
    return <div className="admin-page"><div className="admin-card p-8" role="alert"><h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Ringkasan belum dapat dimuat</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Portal API mengembalikan status {result.status}. Tidak ada detail internal yang ditampilkan.</p></div></div>;
  }

  const groups = Object.entries(result.data.dependencies.reduce<Record<string, DependencyHealth[]>>((result, dependency) => {
    (result[dependency.group] ||= []).push(dependency);
    return result;
  }, {}));
  return (
    <div className="admin-page space-y-8">
      <header className="admin-page-header">
        <div><p className="admin-kicker">OPERASI READ-ONLY</p><h1 className="admin-page-title">Kesehatan Integrasi</h1><p className="admin-page-copy">Snapshot allowlist dependensi internal tanpa credential, URL mentah, stack trace, atau kontrol operasional.</p></div>
        <div className="flex flex-col items-end gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${statusStyle[result.data.status]}`}>Keseluruhan: {statusCopy[result.data.status]}</span><Link href="/dashboard/integration-health" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">Muat ulang</Link></div>
      </header>
      <div className="admin-card grid gap-3 p-4 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <p><span className="font-bold">Snapshot:</span> <time dateTime={result.data.checked_at}>{formattedTime(result.data.checked_at)}</time></p>
        <p className="break-all sm:text-right"><span className="font-bold">Correlation ID:</span> {result.data.correlation_id}</p>
      </div>
      {groups.map(([group, dependencies]) => (
        <section key={group} aria-labelledby={`group-${group}`} className="space-y-4">
          <div><h2 id={`group-${group}`} className="text-xl font-black text-slate-900 dark:text-white">{groupCopy[group] || "Integrasi"}</h2><p className="mt-1 text-sm text-slate-500">Status dan freshness dari probe tetap yang dijalankan server.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dependencies?.map((dependency) => <DependencyCard key={dependency.key} dependency={dependency} />)}</div>
        </section>
      ))}
    </div>
  );
}
