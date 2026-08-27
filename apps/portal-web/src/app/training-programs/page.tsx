import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, ErrorState, PageHero } from "@/components/public-content";
import { listTrainingPrograms } from "@/lib/training-programs";

export const metadata: Metadata = { title: "Pelatihan Penuh", description: "Temukan program pelatihan terstruktur di Teman Belajar.", alternates: { canonical: "/training-programs" } };

function href(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return `/training-programs${params.size ? `?${params}` : ""}`;
}

export default async function TrainingProgramsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listTrainingPrograms(query, page);

  return <div>
    <PageHero eyebrow="Pelatihan Penuh" title="Program terstruktur untuk capaian yang nyata" description="Jelajahi rangkaian course formal, jadwal cohort, dan progres yang tetap bersumber dari Moodle." />
    <section className="portal-container py-10 sm:py-14">
      <form role="search" className="portal-card mb-8 flex flex-col gap-3 p-4 sm:flex-row" action="/training-programs">
        <label htmlFor="training-search" className="sr-only">Cari program pelatihan</label>
        <input id="training-search" name="q" type="search" maxLength={100} defaultValue={query} placeholder="Cari judul, ringkasan, atau sasaran peserta" className="portal-search-input min-h-11 flex-1" />
        <button className="portal-button-primary min-h-11">Cari program</button>
        {query ? <Link href="/training-programs" className="portal-button-secondary min-h-11">Hapus filter</Link> : null}
      </form>
      {result.error ? <ErrorState title="Katalog program belum dapat dimuat" /> : result.data.length === 0 ? <EmptyState title={query ? "Program tidak ditemukan" : "Belum ada program terbit"} description={query ? "Coba gunakan kata kunci lain." : "Program yang telah ditinjau dan diterbitkan akan tampil di sini."} /> : <>
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="portal-eyebrow">Katalog Program</p><h2 className="mt-2 text-2xl font-black text-slate-900">{query ? `Hasil untuk “${query}”` : "Pelatihan yang tersedia"}</h2></div><p className="text-sm font-semibold text-slate-500">{result.pagination.total} program</p></div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{result.data.map(program => <article key={program.id} className="portal-card portal-course-card p-6">
          <div className="flex flex-wrap gap-2"><span className="portal-badge">Program penuh</span><span className="portal-badge">{program.courses?.length || 0} course</span></div>
          <h3 className="mt-5 text-xl font-black leading-7 text-slate-900"><Link href={`/training-programs/${program.slug}`} className="hover:text-teal-700">{program.title}</Link></h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{program.summary}</p>
          {program.audience ? <p className="mt-4 text-xs font-bold text-slate-500">Untuk: {program.audience}</p> : null}
          <div className="mt-auto border-t border-slate-100 pt-5"><Link href={`/training-programs/${program.slug}`} className="font-extrabold text-teal-700">Lihat program →</Link></div>
        </article>)}</div>
        {result.pagination.total_pages > 1 ? <nav className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6" aria-label="Paginasi program">
          <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={href(query, Math.max(1, page - 1))} className={`portal-button-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Sebelumnya</Link>
          <p className="text-sm font-semibold text-slate-500">Halaman {page} dari {result.pagination.total_pages}</p>
          <Link aria-disabled={page >= result.pagination.total_pages} tabIndex={page >= result.pagination.total_pages ? -1 : undefined} href={href(query, Math.min(result.pagination.total_pages, page + 1))} className={`portal-button-secondary ${page >= result.pagination.total_pages ? "pointer-events-none opacity-40" : ""}`}>Berikutnya →</Link>
        </nav> : null}
      </>}
    </section>
  </div>;
}
