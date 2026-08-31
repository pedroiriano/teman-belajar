import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { auditQueryKeys, auditTime, safeAuditParams, type AuditPage } from "@/lib/audit-center";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function loadAudit(token: string, params: URLSearchParams): Promise<{ data?: AuditPage; status: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-events?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { status: response.status };
    return { data: await response.json() as AuditPage, status: response.status };
  } catch { return { status: 503 }; }
}

function resultStyle(result: string) {
  if (result === "SUCCESS" || result === "success") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (result === "DENIED" || result === "FAILED" || result === "failure") return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300";
  return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

export default async function AuditCenterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) return <AuditError title="Akses ditolak" message="Audit Center hanya tersedia untuk Portal Administrator." />;
  const token = await getServerAccessToken();
  if (!token) return <AuditError title="Sesi tidak tersedia" message="Login ulang untuk membuka Audit Center." />;
  const input = await searchParams;
  const query = safeAuditParams(input);
  const result = await loadAudit(token, query);
  if (!result.data) return <AuditError title="Audit belum dapat dimuat" message={`Portal API mengembalikan status ${result.status}. Tidak ada detail internal yang ditampilkan.`} />;

  const exportParams = new URLSearchParams();
  for (const key of auditQueryKeys) { const value = input[key]; if (typeof value === "string") exportParams.set(key, value); }
  const canExport = Boolean(exportParams.get("from") && exportParams.get("to"));
  const nextParams = new URLSearchParams(query); nextParams.delete("limit");
  if (result.data.next_cursor) nextParams.set("cursor", result.data.next_cursor);

  return <div className="admin-page space-y-6">
    <header className="admin-page-header">
      <div><p className="admin-kicker">INVESTIGASI READ-ONLY</p><h1 className="admin-page-title">Audit Center</h1><p className="admin-page-copy">Audit trail tersanitasi dengan retention 365 hari. Waktu ditampilkan dalam Asia/Jakarta.</p></div>
      {canExport ? <Link href={`/api/bff/audit/export?${exportParams}`} className="admin-button">Ekspor CSV</Link> : <span className="admin-button-secondary cursor-not-allowed opacity-60" aria-disabled="true" title="Pilih tanggal mulai dan akhir">Ekspor perlu rentang tanggal</span>}
    </header>

    <form className="admin-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4" action="/dashboard/audit" method="get">
      <AuditInput name="event" label="Event" value={input.event} placeholder="CONTOH_EVENT" />
      <AuditInput name="module" label="Modul" value={input.module} placeholder="knowledge" />
      <AuditInput name="actor" label="Actor ID" value={input.actor} placeholder="UUID actor" />
      <AuditInput name="result" label="Hasil" value={input.result} placeholder="SUCCESS" />
      <AuditInput name="target_type" label="Tipe target" value={input.target_type} placeholder="knowledge_article" />
      <AuditInput name="target_id" label="ID target" value={input.target_id} placeholder="ID tepat" />
      <AuditInput name="correlation_id" label="Correlation ID" value={input.correlation_id} placeholder="Correlation ID" />
      <div className="grid grid-cols-2 gap-3"><AuditInput name="from" label="Dari (UTC)" value={input.from} type="date" /><AuditInput name="to" label="Sampai (UTC)" value={input.to} type="date" /></div>
      <div className="flex gap-3 md:col-span-2 xl:col-span-4"><button className="admin-button" type="submit">Terapkan filter</button><Link className="admin-button-secondary" href="/dashboard/audit">Reset</Link></div>
    </form>

    <section className="admin-card overflow-hidden" aria-labelledby="audit-results">
      <div className="border-b border-slate-200 p-5 dark:border-slate-700"><h2 id="audit-results" className="text-lg font-black text-slate-900 dark:text-white">Catatan audit</h2><p className="mt-1 text-sm text-slate-500">Maksimal 25 catatan per halaman dengan cursor deterministik.</p></div>
      {result.data.items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Tidak ada catatan pada filter ini.</p> : <>
        <div className="divide-y divide-slate-200 dark:divide-slate-700 md:hidden">{result.data.items.map((item) => <article key={item.id} className="grid gap-3 p-5" aria-label={`${item.event} pada ${auditTime(item.occurred_at)}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block break-words text-slate-900 dark:text-white">{item.event}</strong><span className="text-xs text-slate-500">{item.module}</span></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${resultStyle(item.result)}`}>{item.result}</span></div><dl className="grid gap-2 text-xs"><div><dt className="text-slate-500">Waktu</dt><dd><time dateTime={item.occurred_at}>{auditTime(item.occurred_at)}</time></dd></div><div><dt className="text-slate-500">Actor</dt><dd className="break-all font-mono">{item.actor_user_id || "Sistem"}</dd></div><div><dt className="text-slate-500">Target</dt><dd className="break-all">{item.target_type} / {item.target_id}</dd></div></dl><Link className="font-bold text-sky-700 hover:underline dark:text-sky-300" href={`/dashboard/audit/${item.id}`}>Lihat detail</Link></article>)}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/40"><tr><th className="px-5 py-3">Waktu</th><th className="px-5 py-3">Event / Modul</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Hasil</th><th className="px-5 py-3"><span className="sr-only">Detail</span></th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700">{result.data.items.map((item) => <tr key={item.id} className="align-top"><td className="whitespace-nowrap px-5 py-4"><time dateTime={item.occurred_at}>{auditTime(item.occurred_at)}</time></td><td className="px-5 py-4"><strong className="block text-slate-900 dark:text-white">{item.event}</strong><span className="text-xs text-slate-500">{item.module}</span></td><td className="max-w-44 break-all px-5 py-4 font-mono text-xs">{item.actor_user_id || "Sistem"}</td><td className="px-5 py-4"><span className="block text-xs text-slate-500">{item.target_type}</span><span className="break-all">{item.target_id}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${resultStyle(item.result)}`}>{item.result}</span></td><td className="px-5 py-4"><Link className="font-bold text-sky-700 hover:underline dark:text-sky-300" href={`/dashboard/audit/${item.id}`}>Detail</Link></td></tr>)}</tbody></table></div>
      </>}
      {result.data.next_cursor && <div className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-700"><Link className="admin-button-secondary" href={`/dashboard/audit?${nextParams}`}>Halaman berikutnya</Link></div>}
    </section>
  </div>;
}

function AuditInput({ name, label, value, placeholder, type = "text" }: { name: string; label: string; value?: string | string[]; placeholder?: string; type?: "text" | "date" }) {
  return <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{label}<input className="admin-input" name={name} type={type} defaultValue={typeof value === "string" ? value : ""} placeholder={placeholder} autoComplete="off" /></label>;
}

function AuditError({ title, message }: { title: string; message: string }) {
  return <div className="admin-page"><div className="admin-card p-8" role="alert"><h1 className="text-xl font-black text-rose-700 dark:text-rose-300">{title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p></div></div>;
}
