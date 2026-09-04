import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminIcon } from "@/components/admin-icon";
import { CubaHealthCharts } from "@/components/integration-health/cuba-health-charts";

export const dynamic = "force-dynamic";

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
  healthy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50",
  degraded: "bg-yellow-50 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50",
  down: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50",
  unknown: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
};

const statusDotStyle: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-yellow-500",
  down: "bg-rose-500",
  unknown: "bg-slate-400",
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
    return { data: (await response.json()) as HealthSnapshot, status: response.status };
  } catch {
    return { status: 503 };
  }
}

function formattedTime(value?: string) {
  if (!value) return "Belum pernah berhasil";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "Waktu tidak valid"
    : timestamp.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function correlationPathSafe(value: string) {
  return value === CORRELATION_PATH ? value : CORRELATION_PATH;
}

function DependencyCard({ dependency }: { dependency: DependencyHealth }) {
  const correlationPath =
    dependency.correlation_path === CORRELATION_PATH
      ? correlationPathSafe(dependency.correlation_path)
      : null;

  return (
    <article
      className="cuba-card admin-card flex h-full flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md"
      aria-labelledby={`health-${dependency.key}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {groupCopy[dependency.group] || "Integrasi"}
          </p>
          <h3
            id={`health-${dependency.key}`}
            className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white"
          >
            {dependency.name}
          </h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyle[dependency.status]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotStyle[dependency.status]}`} aria-hidden="true" />
          <span className="sr-only">Status: </span>
          {statusCopy[dependency.status]}
        </span>
      </div>

      <dl className="mt-auto grid gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Diperiksa</dt>
          <dd className="text-right font-medium text-slate-700 dark:text-slate-200">
            <time dateTime={dependency.checked_at}>{formattedTime(dependency.checked_at)}</time>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Terakhir berhasil</dt>
          <dd className="text-right font-medium text-slate-700 dark:text-slate-200">
            {formattedTime(dependency.last_success_at)}
          </dd>
        </div>
        {typeof dependency.freshness_seconds === "number" && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Freshness</dt>
            <dd className="font-semibold text-slate-700 dark:text-slate-200">
              {dependency.freshness_seconds} detik
            </dd>
          </div>
        )}
        {dependency.error_class && (
          <div className="flex justify-between gap-4 rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2">
            <dt className="text-rose-600 dark:text-rose-400 font-bold">Kelas gangguan</dt>
            <dd className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-300">
              {dependency.error_class}
            </dd>
          </div>
        )}
      </dl>

      {correlationPath && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2">
          <Link
            href={correlationPath}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200 hover:underline"
          >
            <span>Lihat korelasi metrik API</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </article>
  );
}

export default async function IntegrationHealthPage() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return (
      <div className="admin-page">
        <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
          <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Kesehatan integrasi hanya tersedia untuk Portal Administrator.
          </p>
        </div>
      </div>
    );
  }

  const token = await getServerAccessToken();
  if (!token) {
    return (
      <div className="admin-page">
        <div className="admin-card rounded-xl border border-yellow-200 bg-yellow-50/50 p-8 dark:border-yellow-900/40 dark:bg-yellow-950/20" role="alert">
          <h1 className="text-xl font-black text-yellow-800 dark:text-yellow-200">Sesi tidak tersedia</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Login ulang untuk memuat kesehatan integrasi.
          </p>
        </div>
      </div>
    );
  }

  const result = await fetchHealth(token);
  if (!result.data) {
    return (
      <div className="admin-page">
        <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
          <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Ringkasan belum dapat dimuat</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Portal API mengembalikan status {result.status}. Tidak ada detail internal yang ditampilkan.
          </p>
        </div>
      </div>
    );
  }

  const dependencies = result.data.dependencies;
  const totalCount = dependencies.length;
  const healthyCount = dependencies.filter((d) => d.status === "healthy").length;
  const degradedCount = dependencies.filter((d) => d.status === "degraded").length;
  const downCount = dependencies.filter((d) => d.status === "down").length;

  const groups = Object.entries(
    dependencies.reduce<Record<string, DependencyHealth[]>>((acc, dependency) => {
      (acc[dependency.group] ||= []).push(dependency);
      return acc;
    }, {})
  );

  return (
    <div className="admin-page space-y-6">
      {/* Header Cuba */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            OPERASI READ-ONLY
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Kesehatan Integrasi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Snapshot allowlist dependensi internal tanpa credential, URL mentah, stack trace, atau kontrol operasional.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wide ${statusStyle[result.data.status]}`}
          >
            <span
              className={`h-2 w-2 rounded-full animate-pulse ${statusDotStyle[result.data.status]}`}
              aria-hidden="true"
            />
            <span>Keseluruhan: {statusCopy[result.data.status]}</span>
          </span>
          <Link
            href="/dashboard/integration-health"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <AdminIcon name="dashboard" className="h-4 w-4" />
            <span>Muat ulang</span>
          </Link>
        </div>
      </header>

      {/* 4 Cuba KPI Cards Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cuba-kpi-card flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <AdminIcon name="health" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Dependensi
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white">
              {totalCount}
            </p>
          </div>
        </div>

        <div className="cuba-kpi-card flex items-center gap-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <AdminIcon name="audit" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Layanan Sehat
            </p>
            <p className="mt-0.5 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {healthyCount}
            </p>
          </div>
        </div>

        <div className="cuba-kpi-card flex items-center gap-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300">
            <AdminIcon name="announcement" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Terdegradasi
            </p>
            <p className="mt-0.5 text-2xl font-black text-yellow-700 dark:text-yellow-300">
              {degradedCount}
            </p>
          </div>
        </div>

        <div className="cuba-kpi-card flex items-center gap-4 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AdminIcon name="folder" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gangguan / Down
            </p>
            <p className="mt-0.5 text-2xl font-black text-rose-600 dark:text-rose-400">
              {downCount}
            </p>
          </div>
        </div>
      </div>

      {/* Visualisasi Grafik Lanjutan ApexCharts */}
      <CubaHealthCharts dependencies={dependencies} overallStatus={result.data.status} />

      {/* Snapshot Metadata Box */}
      <div className="cuba-card rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-xs text-slate-600 dark:text-slate-300 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">Snapshot Probe:</span>
          <time dateTime={result.data.checked_at} className="font-medium">
            {formattedTime(result.data.checked_at)} (Asia/Jakarta)
          </time>
        </div>
        <div className="mt-2 flex items-center gap-2 sm:mt-0">
          <span className="font-bold text-slate-900 dark:text-white">Correlation ID:</span>
          <code className="rounded bg-slate-200/80 dark:bg-slate-700/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
            {result.data.correlation_id}
          </code>
        </div>
      </div>

      {/* Kelompok Dependensi */}
      {groups.map(([group, deps]) => {
        const groupHealthy = deps.filter((d) => d.status === "healthy").length;
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-3">
                <h2
                  id={`group-${group}`}
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  {groupCopy[group] || "Integrasi"}
                </h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {deps.length} layanan
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {groupHealthy}/{deps.length} Sehat
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deps.map((dep) => (
                <DependencyCard key={dep.key} dependency={dep} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
