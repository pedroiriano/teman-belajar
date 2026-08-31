import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { auditTime, type AuditEvent } from "@/lib/audit-center";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) return <State title="Akses ditolak" message="Detail audit hanya tersedia untuk Portal Administrator." />;
  const token = await getServerAccessToken();
  const { id } = await params;
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) return <State title="Detail tidak tersedia" message="Sesi atau identifier audit tidak valid." />;
  let event: AuditEvent | undefined;
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-events/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (response.ok) event = await response.json() as AuditEvent;
  } catch { event = undefined; }
  if (!event) return <State title="Detail belum dapat dimuat" message="Catatan tidak ditemukan atau layanan audit sedang tidak tersedia." />;
  const fields = [["Event", event.event], ["Modul", event.module], ["Actor ID", event.actor_user_id || "Sistem"], ["Target", `${event.target_type} / ${event.target_id}`], ["Hasil", event.result], ["Waktu", auditTime(event.occurred_at)], ["IP tersamarkan", event.ip_masked || "Tidak dicatat"], ["Correlation ID", event.correlation_id || "Tidak tersedia"]];
  return <div className="admin-page space-y-6"><header className="admin-page-header"><div><p className="admin-kicker">DETAIL TERSANITASI</p><h1 className="admin-page-title">Catatan Audit</h1><p className="admin-page-copy">Tidak ada payload mentah, credential, URL mentah, atau stack trace.</p></div><Link href="/dashboard/audit" className="admin-button-secondary">Kembali</Link></header><section className="admin-card p-6"><dl className="grid gap-5 md:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-white">{value}</dd></div>)}</dl>{event.metadata && Object.keys(event.metadata).length > 0 && <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700"><h2 className="text-sm font-black text-slate-900 dark:text-white">Metadata allowlist</h2><dl className="mt-3 grid gap-3 md:grid-cols-2">{Object.entries(event.metadata).map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="text-sm font-semibold">{value}</dd></div>)}</dl></div>}</section></div>;
}

function State({ title, message }: { title: string; message: string }) { return <div className="admin-page"><div className="admin-card p-8" role="alert"><h1 className="text-xl font-black text-rose-700 dark:text-rose-300">{title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p><Link className="mt-5 inline-flex font-bold text-sky-700" href="/dashboard/audit">Kembali ke Audit Center</Link></div></div>; }
