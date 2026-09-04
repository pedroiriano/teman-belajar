import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { auditQueryKeys, safeAuditParams, type AuditPage } from "@/lib/audit-center";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminIcon } from "@/components/admin-icon";
import { CubaAuditTable } from "@/components/audit/cuba-audit-table";

export const dynamic = "force-dynamic";
 
const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function loadAudit(token: string, params: URLSearchParams): Promise<{ data?: AuditPage; status: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: response.status };
    return { data: (await response.json()) as AuditPage, status: response.status };
  } catch {
    return { status: 503 };
  }
}

export default async function AuditCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return (
      <AuditError
        title="Akses ditolak"
        message="Audit Center hanya tersedia untuk Portal Administrator."
      />
    );
  }
  const token = await getServerAccessToken();
  if (!token) {
    return (
      <AuditError
        title="Sesi tidak tersedia"
        message="Login ulang untuk membuka Audit Center."
      />
    );
  }
  const input = await searchParams;
  const query = safeAuditParams(input);
  const result = await loadAudit(token, query);
  if (!result.data) {
    return (
      <AuditError
        title="Audit belum dapat dimuat"
        message={`Portal API mengembalikan status ${result.status}. Tidak ada detail internal yang ditampilkan.`}
      />
    );
  }

  const exportParams = new URLSearchParams();
  for (const key of auditQueryKeys) {
    const value = input[key];
    if (typeof value === "string") exportParams.set(key, value);
  }
  const canExport = Boolean(exportParams.get("from") && exportParams.get("to"));
  const nextParams = new URLSearchParams(query);
  nextParams.delete("limit");
  if (result.data.next_cursor) nextParams.set("cursor", result.data.next_cursor);

  return (
    <div className="admin-page space-y-6">
      {/* Header Cuba */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            INVESTIGASI READ-ONLY
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Audit Center
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit trail tersanitasi dengan retention 365 hari. Waktu ditampilkan dalam Asia/Jakarta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canExport ? (
            <Link
              href={`/api/bff/audit/export?${exportParams}`}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              <AdminIcon name="file" className="h-4 w-4" />
              <span>Ekspor CSV</span>
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
              aria-disabled="true"
              title="Pilih tanggal mulai dan akhir pada filter untuk mengaktifkan ekspor"
            >
              <AdminIcon name="file" className="h-4 w-4" />
              <span>Ekspor perlu rentang tanggal</span>
            </span>
          )}
        </div>
      </header>

      {/* Filter Form Panel Cuba */}
      <form
        className="cuba-card admin-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
        action="/dashboard/audit"
        method="get"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AdminIcon name="audit" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Filter Log Aktivitas</h2>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Maksimal 25 catatan per filter</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AuditInput name="event" label="Event" value={input.event} placeholder="CONTOH_EVENT" />
          <AuditInput name="module" label="Modul" value={input.module} placeholder="knowledge" />
          <AuditInput name="actor" label="Actor ID" value={input.actor} placeholder="UUID actor" />
          <AuditInput name="result" label="Hasil" value={input.result} placeholder="SUCCESS" />
          <AuditInput name="target_type" label="Tipe target" value={input.target_type} placeholder="knowledge_article" />
          <AuditInput name="target_id" label="ID target" value={input.target_id} placeholder="ID tepat" />
          <AuditInput name="correlation_id" label="Correlation ID" value={input.correlation_id} placeholder="Correlation ID" />
          <div className="grid grid-cols-2 gap-2">
            <AuditInput name="from" label="Dari (UTC)" value={input.from} type="date" />
            <AuditInput name="to" label="Sampai (UTC)" value={input.to} type="date" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            type="submit"
          >
            <span>Terapkan filter</span>
          </button>
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            href="/dashboard/audit"
          >
            <span>Reset</span>
          </Link>
        </div>
      </form>

      {/* Tabel Data Audit Cuba DataTables */}
      <section
        className="overflow-x-auto"
        aria-labelledby="audit-results"
      >
        <h2 id="audit-results" className="sr-only">
          Catatan Audit
        </h2>
        <CubaAuditTable
          items={result.data.items}
          canExport={canExport}
          exportHref={canExport ? `/api/bff/audit/export?${exportParams}` : undefined}
          nextHref={result.data.next_cursor ? `/dashboard/audit?${nextParams}` : undefined}
        />
      </section>
    </div>
  );
}

function AuditInput({
  name,
  label,
  value,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  value?: string | string[];
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
      {label}
      <input
        className="admin-input"
        name={name}
        type={type}
        defaultValue={typeof value === "string" ? value : ""}
        placeholder={placeholder}
        autoComplete="off"
      />
    </label>
  );
}

function AuditError({ title, message }: { title: string; message: string }) {
  return (
    <div className="admin-page">
      <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
        <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}
