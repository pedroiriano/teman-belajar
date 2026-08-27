import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTrainingProgram, getTrainingProgress, type TrainingCourse } from "@/lib/training-programs";

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) : "Belum ditentukan"; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const detail = await getTrainingProgram(slug);
  if (!detail) return { title: "Program tidak ditemukan" };
  return { title: detail.program.title, description: detail.program.summary, alternates: { canonical: `/training-programs/${detail.program.slug}` } };
}

function CourseCard({ course }: { course: TrainingCourse }) {
  const state = course.learner_state === "completed" ? "Selesai" : course.learner_state === "enrolled" ? "Terdaftar" : course.learner_state === "not_enrolled" ? "Belum terdaftar" : null;
  return <li className="portal-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="portal-eyebrow">Course {course.required ? "wajib" : "opsional"}</p><h3 className="mt-2 text-lg font-black text-slate-900">{course.full_name || `Course Moodle #${course.moodle_course_id}`}</h3></div><span className={`portal-badge ${course.availability === "unavailable" ? "opacity-70" : ""}`}>{course.availability === "available" ? state || "Tersedia" : "Data belum tersedia"}</span></div>
    {course.summary ? <p className="mt-3 text-sm leading-6 text-slate-600">{course.summary}</p> : null}
    {typeof course.progress === "number" ? <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>Progres Moodle</span><span>{Math.round(course.progress)}%</span></div><div className="portal-course-progress" role="progressbar" aria-label={`Progres ${course.full_name || course.moodle_course_id}`} aria-valuenow={Math.round(course.progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, course.progress))}%` }} /></div></div> : null}
    {course.start_url ? <a href={course.start_url} className="portal-button-secondary mt-5" rel="noreferrer">Buka di Moodle</a> : null}
  </li>;
}

export default async function TrainingProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [detail, learner] = await Promise.all([getTrainingProgram(slug), getTrainingProgress(slug)]);
  if (!detail) notFound();
  const progress = learner.data;
  const courses = progress?.courses || detail.courses;
  const provenance = progress?.provenance || detail.provenance;

  return <div>
    <section className="portal-course-hero border-b border-slate-200"><div className="portal-course-hero-shape portal-course-hero-shape-one"/><div className="portal-course-hero-shape portal-course-hero-shape-two"/><div className="portal-container relative z-10 grid gap-10 py-14 lg:grid-cols-[1fr_22rem] lg:items-center lg:py-20"><div><Link href="/training-programs" className="portal-course-hero-label">← Katalog program</Link><h1 className="portal-course-hero-title">{detail.program.title}</h1><p className="portal-course-hero-copy">{detail.program.summary}</p><div className="portal-course-hero-trust"><span>{courses.length} course terstruktur</span><span>State formal dari Moodle</span><span>Jadwal cohort transparan</span></div></div>
      <aside className="portal-card p-6" aria-label="Status program"><p className="portal-eyebrow">Status Anda</p>{progress ? <><p className="mt-3 text-3xl font-black text-slate-900">{progress.progress_percent == null ? "—" : `${Math.round(progress.progress_percent)}%`}</p><p className="mt-2 text-sm leading-6 text-slate-600">{progress.eligibility.message}</p><p className="mt-3 text-xs font-bold text-slate-500">{progress.completed_courses} dari {progress.total_courses} course selesai</p>{progress.cta.url ? <a href={progress.cta.url} rel="noreferrer" className={progress.cta.kind === "check_access" ? "portal-button-secondary mt-5 w-full" : "portal-button-primary mt-5 w-full"}>{progress.cta.label}</a> : <span className="portal-button-secondary mt-5 w-full opacity-60" aria-disabled="true">{progress.cta.label}</span>}</> : learner.authenticated ? <><p className="mt-3 font-black text-slate-900">Progres belum tersedia</p><p className="mt-2 text-sm leading-6 text-slate-600">Data program tetap dapat dibaca. Coba lagi saat Moodle kembali tersedia.</p></> : <><p className="mt-3 font-black text-slate-900">Masuk untuk memeriksa akses</p><p className="mt-2 text-sm leading-6 text-slate-600">Kami tidak mengasumsikan eligibility atau enrolment sebelum dikonfirmasi oleh API.</p><Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/training-programs/${slug}`)}`} className="portal-button-primary mt-5 w-full">Masuk</Link></>}</aside>
    </div></section>
    <section className="portal-container grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_20rem]"><div><p className="portal-eyebrow">Tentang program</p><h2 className="mt-2 text-3xl font-black text-slate-900">Hasil belajar dalam satu rangkaian</h2><div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">{detail.program.description}</div>{detail.program.audience ? <div className="portal-card mt-6 p-5"><h3 className="font-black text-slate-900">Sasaran peserta</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail.program.audience}</p></div> : null}{detail.program.eligibility_text ? <div className="portal-card mt-4 p-5"><h3 className="font-black text-slate-900">Panduan eligibility</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail.program.eligibility_text}</p><p className="mt-3 text-xs font-bold text-slate-500">Panduan ini informatif; akses aktual tetap dikonfirmasi Moodle.</p></div> : null}</div>
      <aside><p className="portal-eyebrow">Jadwal cohort</p><div className="mt-4 grid gap-3">{detail.program.cohorts?.length ? detail.program.cohorts.map(cohort => <div key={cohort.id} className="portal-card p-4"><h3 className="font-black text-slate-900">{cohort.label}</h3><p className="mt-2 text-xs leading-5 text-slate-500">Mulai: {formatDate(cohort.starts_at)}<br/>Selesai: {formatDate(cohort.ends_at)}</p><span className="portal-badge mt-3">{cohort.status === "scheduled" ? "Terjadwal" : cohort.status === "completed" ? "Selesai" : "Dibatalkan"}</span></div>) : <div className="portal-card p-4 text-sm leading-6 text-slate-600">Jadwal cohort belum diumumkan.</div>}</div></aside>
    </section>
    <section className="portal-section portal-section-muted"><div className="portal-container"><div className="portal-section-heading"><p className="portal-eyebrow">Komposisi program</p><h2 className="portal-section-title">Course formal yang dikelola Moodle</h2><p className="portal-section-copy">Katalog, enrolment, completion, dan progres tidak disalin sebagai kebenaran baru di Portal.</p></div>{provenance.state === "degraded" ? <div role="status" className="mx-auto mt-7 max-w-3xl rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">Sebagian data Moodle belum tersedia. Informasi editorial program tetap ditampilkan tanpa menjanjikan akses.</div> : null}<ul className="mx-auto mt-8 grid max-w-4xl gap-5">{courses.map(course => <CourseCard key={course.moodle_course_id} course={course}/>)}</ul><p className="mt-6 text-center text-xs font-semibold text-slate-500">Sumber: Moodle · Diperiksa {formatDate(provenance.checked_at)} · {provenance.state === "fresh" ? "Data segar" : "Degradasi parsial"}</p></div></section>
  </div>;
}
