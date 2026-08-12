import Link from "next/link";

export type PaginationData = { page: number; page_size: number; total: number; total_pages: number };

export function PageHero({ eyebrow, title, description, tone = "teal" }: { eyebrow: string; title: string; description: string; tone?: "teal" | "amber" }) {
  return <section className={`relative overflow-hidden ${tone === "amber" ? "bg-amber-50" : "bg-teal-50"}`}><div className="absolute -right-20 -top-32 h-72 w-72 rounded-full border-[48px] border-white/70" aria-hidden="true"/><div className="portal-container relative py-14 sm:py-20"><p className={`text-xs font-black uppercase tracking-[0.2em] ${tone === "amber" ? "text-amber-700" : "text-teal-700"}`}>{eyebrow}</p><h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{description}</p></div></section>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="portal-card px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h6"/></svg></span><h2 className="mt-5 text-xl font-extrabold text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p></div>;
}

export function ErrorState({ title = "Konten belum dapat dimuat" }: { title?: string }) {
  return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"><h2 className="font-extrabold text-rose-900">{title}</h2><p className="mt-2 text-sm text-rose-700">Periksa koneksi Anda atau coba muat ulang halaman ini beberapa saat lagi.</p></div>;
}

export function Pagination({ pagination, path }: { pagination?: PaginationData; path: string }) {
  if (!pagination || pagination.total_pages <= 1) return null;
  const previous = Math.max(1, pagination.page - 1);
  const next = Math.min(pagination.total_pages, pagination.page + 1);
  return <nav className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6" aria-label="Paginasi"><Link aria-disabled={pagination.page <= 1} tabIndex={pagination.page <= 1 ? -1 : undefined} href={`${path}?page=${previous}`} className={`portal-button-secondary ${pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Sebelumnya</Link><p className="text-sm font-semibold text-slate-500">Halaman {pagination.page} dari {pagination.total_pages}</p><Link aria-disabled={pagination.page >= pagination.total_pages} tabIndex={pagination.page >= pagination.total_pages ? -1 : undefined} href={`${path}?page=${next}`} className={`portal-button-secondary ${pagination.page >= pagination.total_pages ? "pointer-events-none opacity-40" : ""}`}>Berikutnya →</Link></nav>;
}

export function formatDate(value?: string | null) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
}
