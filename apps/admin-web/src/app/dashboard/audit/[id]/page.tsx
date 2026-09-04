import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { auditTime, type AuditEvent } from "@/lib/audit-center";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminIcon } from "@/components/admin-icon";

export const dynamic = "force-dynamic";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

function resultBadgeStyle(result: string) {
  const upper = result.toUpperCase();
  if (upper === "SUCCESS") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50";
  }
  if (upper === "DENIED" || upper === "FAILED" || upper === "FAILURE") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
}

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return <State title="Akses ditolak" message="Detail audit hanya tersedia untuk Portal Administrator." />;
  }
  const token = await getServerAccessToken();
  const { id } = await params;
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) {
    return <State title="Detail tidak tersedia" message="Sesi atau identifier audit tidak valid." />;
  }
  let event: AuditEvent | undefined;
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-events/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) event = (await response.json()) as AuditEvent;
  } catch {
    event = undefined;
  }
  if (!event) {
    return <State title="Detail belum dapat dimuat" message="Catatan tidak ditemukan atau layanan audit sedang tidak tersedia." />;
  }

  const fields = [
    ["Event", event.event],
    ["Modul", event.module],
    ["Actor ID", event.actor_user_id || "Sistem"],
    ["Target", `${event.target_type} / ${event.target_id}`],
    ["Waktu", auditTime(event.occurred_at)],
    ["IP tersamarkan", event.ip_masked || "Tidak dicatat"],
    ["Correlation ID", event.correlation_id || "Tidak tersedia"],
  ];

  return (
    <div className="admin-page space-y-6">
      {/* Header Cuba */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            DETAIL TERSANITASI
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Catatan Audit
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide ${resultBadgeStyle(event.result)}`}>
              {event.result}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tidak ada payload mentah, credential, URL mentah, atau stack trace.
          </p>
        </div>
        <Link
          href="/dashboard/audit"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Kembali ke Jejak Audit</span>
        </Link>
      </header>

      {/* Main Card */}
      <section className="cuba-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Informasi Kejadian
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ID Audit: <code className="font-mono text-slate-700 dark:text-slate-300">{event.id}</code>
          </p>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 p-3.5"
            >
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </dt>
              <dd className="mt-1.5 break-all font-mono text-sm font-semibold text-slate-900 dark:text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-2">
              <AdminIcon name="audit" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Metadata Allowlist
              </h3>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(event.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-800/20 p-3"
                >
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{key}</dt>
                  <dd className="mt-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 break-all">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}

function State({ title, message }: { title: string; message: string }) {
  return (
    <div className="admin-page">
      <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
        <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <Link className="mt-5 inline-flex items-center gap-1.5 font-bold text-sky-700 hover:underline dark:text-sky-300" href="/dashboard/audit">
          <span aria-hidden="true">&larr;</span>
          <span>Kembali ke Audit Center</span>
        </Link>
      </div>
    </div>
  );
}
