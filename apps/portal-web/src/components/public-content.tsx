import Link from "next/link";
import { PortalIcon, type PortalIconName } from "@/components/portal-icon";

export type PaginationData = { page: number; page_size: number; total: number; total_pages: number };

export function PageHero({ eyebrow, title, description, tone = "teal", icon = "graduation" }: { eyebrow: string; title: string; description: string; tone?: "teal" | "amber"; icon?: PortalIconName }) {
  return (
    <section className="portal-page-hero" data-techwind-pattern="course-inner-hero">
      <div className="portal-page-hero-orb portal-page-hero-orb-one" aria-hidden="true" />
      <div className="portal-page-hero-orb portal-page-hero-orb-two" aria-hidden="true" />
      <div className="portal-container relative grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20">
        <div>
          <p className={`portal-eyebrow ${tone === "amber" ? "portal-eyebrow-warm" : ""}`}>{eyebrow}</p>
          <h1 className="portal-page-hero-title">{title}</h1>
          <p className="portal-page-hero-copy">{description}</p>
        </div>
        <div className="portal-page-hero-visual" aria-hidden="true">
          <span className="portal-page-hero-icon"><PortalIcon name={icon} className="h-9 w-9" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Teman Belajar</p>
            <p className="mt-1 line-clamp-2 font-extrabold text-slate-900">Pengalaman belajar terhubung</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full w-3/4 rounded-full bg-teal-500" /></div>
          </div>
          <span className="portal-page-hero-badge"><PortalIcon name="sparkles" className="h-4 w-4" /></span>
        </div>
      </div>
    </section>
  );
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
