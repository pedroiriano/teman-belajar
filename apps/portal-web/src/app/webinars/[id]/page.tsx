import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { WebinarActions } from "@/components/webinars/webinar-actions";
import { formatWebinarTime, getWebinar } from "@/lib/webinars";

export const metadata: Metadata = { title: "Detail Webinar", robots: { index: false, follow: false } };

export default async function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawID } = await params;
  if (!/^[1-9][0-9]*$/.test(rawID)) notFound();
  const id = Number(rawID);
  const result = await getWebinar(id);
  if (!result.authenticated) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/webinars/${id}`)}`);
  if (result.status === 404) notFound();
  const session = result.data;
  if (!session) return <section className="portal-container py-16"><div role="alert" className="portal-card p-8 text-center"><h1 className="text-2xl font-black text-slate-900">Webinar belum dapat dibuka</h1><p className="mt-3 text-slate-600">Konfigurasi Zoom Moodle atau koneksi provider belum siap. Coba lagi setelah administrator menyelesaikan konfigurasi.</p><Link href="/webinars" className="portal-button-secondary mt-6">Kembali</Link></div></section>;

  const registrationDisabled = session.registration_state === "configuration_required" || session.registration_state === "full" || session.status !== "scheduled";
  return <div>
    <section className="portal-course-hero border-b border-slate-200"><div className="portal-course-hero-shape portal-course-hero-shape-one"/><div className="portal-course-hero-shape portal-course-hero-shape-two"/><div className="portal-container relative z-10 grid gap-10 py-14 lg:grid-cols-[1fr_22rem] lg:items-center lg:py-20"><div><Link href="/webinars" className="portal-course-hero-label">← Jadwal webinar</Link><h1 className="portal-course-hero-title">{session.title}</h1><p className="portal-course-hero-copy">{session.summary}</p><div className="portal-course-hero-trust"><span>{formatWebinarTime(session.starts_at)} WIB</span><span>Sumber resmi Moodle</span><span>Waitlist tidak digunakan</span></div></div>
      <aside className="portal-card p-6" aria-label="Registrasi webinar"><p className="portal-eyebrow">Status Anda</p><p className="mt-3 text-xl font-black text-slate-900">{session.registered ? "Sudah terdaftar" : session.registration_state === "full" ? "Kuota penuh" : session.registration_state === "configuration_required" ? "Konfigurasi belum lengkap" : "Belum terdaftar"}</p><p className="mt-2 text-sm leading-6 text-slate-600">{session.registered_count} dari {session.capacity || "—"} tempat terisi. Pembatalan tersedia sampai sesi dimulai.</p><div className="mt-5"><WebinarActions id={session.id} registered={session.registered} cancellationAllowed={session.cancellation_allowed} disabled={registrationDisabled} /></div>{session.join_url ? <a href={session.join_url} target="_blank" rel="noreferrer" className="portal-button-primary mt-3 w-full">Buka aktivitas Moodle</a> : null}{session.recording_url ? <a href={session.recording_url} target="_blank" rel="noreferrer" className="portal-button-secondary mt-3 w-full">Lihat rekaman</a> : null}</aside>
    </div></section>
    <section className="portal-container grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_20rem]"><div><p className="portal-eyebrow">Informasi sesi</p><h2 className="mt-2 text-3xl font-black text-slate-900">Belajar langsung dengan konteks yang jelas</h2><dl className="portal-card mt-6 grid gap-5 p-6 sm:grid-cols-2"><div><dt className="text-xs font-black uppercase tracking-wider text-slate-500">Mulai</dt><dd className="mt-2 font-bold text-slate-900">{formatWebinarTime(session.starts_at)} WIB</dd></div><div><dt className="text-xs font-black uppercase tracking-wider text-slate-500">Selesai</dt><dd className="mt-2 font-bold text-slate-900">{formatWebinarTime(session.ends_at)} WIB</dd></div><div><dt className="text-xs font-black uppercase tracking-wider text-slate-500">Narasumber</dt><dd className="mt-2 font-bold text-slate-900">{session.speakers.join(", ") || "Akan diumumkan"}</dd></div><div><dt className="text-xs font-black uppercase tracking-wider text-slate-500">Kehadiran</dt><dd className="mt-2 font-bold text-slate-900">{session.attendance_state === "synced" ? `${Math.round(session.attendance_seconds / 60)} menit` : "Menunggu sinkronisasi"}</dd></div></dl></div><aside className="portal-card h-fit p-5"><h2 className="font-black text-slate-900">Privasi & rekaman</h2><p className="mt-3 text-sm leading-6 text-slate-600">Rekaman hanya tersedia bila host memilih merekam dan mempublikasikannya melalui Moodle. Kehadiran disimpan paling lama 365 hari.</p><p className="mt-4 text-xs font-semibold text-slate-500">Diperbarui {formatWebinarTime(session.synced_at)} WIB</p></aside></section>
  </div>;
}
