import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState, ErrorState, PageHero, Pagination } from "@/components/public-content";
import { formatWebinarTime, listWebinars } from "@/lib/webinars";

export const metadata: Metadata = { title: "Webinar", description: "Sesi live Teman Belajar yang dikelola melalui Moodle Zoom.", robots: { index: false, follow: false } };

const states = { scheduled: "Terjadwal", live: "Sedang berlangsung", completed: "Selesai", cancelled: "Dibatalkan" } as const;

export default async function WebinarsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = await searchParams;
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listWebinars(page);
  if (!result.authenticated) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/webinars?page=${page}`)}`);

  return <div>
    <PageHero eyebrow="Live Learning" title="Webinar bersama narasumber" description="Jadwal, registrasi, kehadiran, dan rekaman bersumber langsung dari aktivitas Zoom di Moodle." />
    <section className="portal-container py-10 sm:py-14">
      {!result.data ? <ErrorState title={result.status === 503 ? "Webinar belum siap digunakan" : "Webinar belum dapat dimuat"} /> : result.data.data.length === 0 ? <EmptyState title="Belum ada webinar tersedia" description="Sesi akan tampil setelah aktivitas webinar Moodle aktif, berlisensi, dan dapat diakses oleh Anda." /> : <>
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="portal-eyebrow">Jadwal Webinar</p><h2 className="mt-2 text-2xl font-black text-slate-900">Sesi yang dapat Anda ikuti</h2></div><p className="text-sm font-semibold text-slate-500">{result.data.total} sesi</p></div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{result.data.data.map(session => <article key={session.id} className="portal-card portal-course-card p-6">
          <div className="flex flex-wrap gap-2"><span className="portal-badge">{states[session.status]}</span><span className="portal-badge">WIB</span>{session.registered ? <span className="portal-badge">Terdaftar</span> : null}</div>
          <h3 className="mt-5 text-xl font-black leading-7 text-slate-900"><Link href={`/webinars/${session.id}`} className="hover:text-teal-700">{session.title}</Link></h3>
          <p className="mt-3 text-sm font-bold text-slate-700">{formatWebinarTime(session.starts_at)}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{session.summary || "Detail sesi tersedia pada halaman webinar."}</p>
          <p className="mt-4 text-xs font-semibold text-slate-500">{session.registered_count} dari {session.capacity || "—"} tempat terisi</p>
          <div className="mt-auto border-t border-slate-100 pt-5"><Link href={`/webinars/${session.id}`} className="font-extrabold text-teal-700">Lihat webinar →</Link></div>
        </article>)}</div>
        <Pagination pagination={result.data} path="/webinars" />
      </>}
    </section>
  </div>;
}
