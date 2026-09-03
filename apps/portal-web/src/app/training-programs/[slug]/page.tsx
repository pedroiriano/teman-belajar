import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb, CourseCard, CourseDetailHero, ContentCard, DetailSidebar, Progress, RelatedContentSection, TrainingProgramCard, formatDate } from "@/components/techwind";
import { getCohortEnrollmentState, getProgramEnrollmentSummary, getRelatedTrainingPrograms, getTrainingProgram, getTrainingProgress, isTrainingProgramSlug } from "@/lib/training-programs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; if (!isTrainingProgramSlug(slug)) return { title: "Program tidak ditemukan" }; const detail = await getTrainingProgram(slug);
  if (!detail) return { title: "Program tidak ditemukan" };
  return { title: detail.program.title, description: detail.program.summary, alternates: { canonical: `/training-programs/${detail.program.slug}` } };
}

export default async function TrainingProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isTrainingProgramSlug(slug)) notFound();
  const [detail, learner, related] = await Promise.all([getTrainingProgram(slug), getTrainingProgress(slug), getRelatedTrainingPrograms(slug, 3)]);
  if (!detail) notFound();
  const progress = learner.data;
  const courses = progress?.courses || detail.courses;
  const provenance = progress?.provenance || detail.provenance;
  const enrollmentSummary = getProgramEnrollmentSummary(detail.program.cohorts);

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { href: "/training-programs", label: "Pelatihan Penuh" },
    { label: detail.program.title },
  ];

  return <div>
    <CourseDetailHero
      title={detail.program.title}
      summary={detail.program.summary}
      backHref="/training-programs"
      backLabel="← Katalog program"
      backgroundImage="/techwind-hero/course/cta.jpg"
      breadcrumbs={breadcrumbs}
      meta={
        <>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">{courses.length} course terstruktur</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">State formal Moodle</span>
          <span className="rounded-full bg-teal-500/20 text-teal-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">Jadwal cohort transparan</span>
        </>
      }
      aside={
        <DetailSidebar
          imageSrc="/techwind-hero/course/cta.jpg"
          imageAlt={detail.program.title}
          factsTitle="Informasi Pelatihan"
          facts={[
            { icon: "book", label: "Jumlah Course", value: `${courses.length} Materi` },
            { icon: "graduation", label: "Platform Belajar", value: "Moodle LMS" },
            { icon: "calendar", label: "Status Pendaftaran", value: enrollmentSummary.label },
            { icon: "shield", label: "Status Akses", value: learner.authenticated ? "Terhubung SSO" : "Perlu Masuk" },
          ]}
          progress={progress ? {
            percent: progress.progress_percent || 0,
            label: "Progres Pelatihan",
            completedCount: progress.completed_courses,
            totalCount: progress.total_courses,
          } : null}
          primaryAction={progress?.cta.url ? {
            label: progress.cta.label,
            href: progress.cta.url,
            subtext: progress.eligibility.message,
          } : learner.authenticated ? {
            label: progress?.cta.label || "Akses Belum Tersedia",
            disabled: true,
            subtext: progress?.eligibility.message || "Data program tetap dapat dibaca. Coba lagi saat Moodle kembali tersedia.",
          } : {
            label: "Masuk untuk memeriksa akses",
            href: `/api/auth/signin?callbackUrl=${encodeURIComponent(`/training-programs/${slug}`)}`,
            subtext: "Kami tidak mengasumsikan eligibility atau enrolment sebelum dikonfirmasi oleh API.",
          }}
          people={[
            {
              name: "Tim Fasilitator Teman Belajar",
              role: "Pengampu & Pengawas Mutu Pelatihan",
              organization: "Pusat Pembelajaran Digital",
            },
          ]}
        >
          {progress?.progress_percent != null ? (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Progress value={progress.progress_percent} label="Progres pelatihan" showValue={false} />
            </div>
          ) : null}

          {/* Cohort Schedule List inside sidebar */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Jadwal Cohort</p>
            {detail.program.cohorts?.length ? (
              <div className="space-y-2.5">
                {detail.program.cohorts.map((cohort) => {
                  const state = getCohortEnrollmentState(cohort);
                  return (
                    <div key={cohort.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <strong className="block font-bold text-slate-900 dark:text-white">{cohort.label}</strong>
                      <span className="block mt-1 text-slate-500 dark:text-slate-400">
                        Pelaksanaan: {formatDate(cohort.starts_at, { time: true })}
                      </span>
                      {cohort.enrollment_closes_at ? (
                        <span className="block text-slate-500 dark:text-slate-400">
                          Batas Daftar: {formatDate(cohort.enrollment_closes_at, { time: true })}
                        </span>
                      ) : null}
                      <span className={`mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${state.badgeClass}`}>
                        {state.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Jadwal cohort belum diumumkan.</p>
            )}
          </div>
        </DetailSidebar>
      }
    />

    <section className="portal-container grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <p className="portal-eyebrow">Tentang program</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Hasil belajar dalam satu rangkaian</h2>
        <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600 dark:text-slate-300">{detail.program.description}</div>
        {detail.program.audience ? (
          <div className="mt-6 p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white">Sasaran peserta</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{detail.program.audience}</p>
          </div>
        ) : null}
        {detail.program.eligibility_text ? (
          <div className="mt-4 p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white">Panduan eligibility</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{detail.program.eligibility_text}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">Panduan ini informatif; akses aktual tetap dikonfirmasi Moodle.</p>
          </div>
        ) : null}
      </div>

      <aside>
        <p className="portal-eyebrow">Jadwal cohort</p>
        <div className="mt-4 grid gap-3">
          {detail.program.cohorts?.length ? detail.program.cohorts.map(cohort => {
            const state = getCohortEnrollmentState(cohort);
            return (
              <ContentCard key={cohort.id} className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white">{cohort.label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Mulai: {formatDate(cohort.starts_at, { time: true })}<br/>
                  Selesai: {formatDate(cohort.ends_at, { time: true })}
                </p>
                {cohort.enrollment_opens_at || cohort.enrollment_closes_at ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pendaftaran: {cohort.enrollment_opens_at ? formatDate(cohort.enrollment_opens_at, { time: true }) : "Sekarang"} s/d {cohort.enrollment_closes_at ? formatDate(cohort.enrollment_closes_at, { time: true }) : "Selesai"}
                  </p>
                ) : null}
                <span className={`mt-3 text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${state.badgeClass}`}>
                  {state.label}
                </span>
              </ContentCard>
            );
          }) : (
            <ContentCard className="p-4 text-sm leading-6 text-slate-600 dark:text-slate-400">Jadwal cohort belum diumumkan.</ContentCard>
          )}
        </div>
      </aside>
    </section>

    <section className="portal-section portal-section-muted">
      <div className="portal-container">
        <div className="portal-section-heading">
          <p className="portal-eyebrow">Komposisi program</p>
          <h2 className="portal-section-title">Course formal yang dikelola Moodle</h2>
          <p className="portal-section-copy">Katalog, enrolment, completion, dan progres tidak disalin sebagai kebenaran baru di Portal.</p>
        </div>
        {provenance.state === "degraded" ? (
          <div role="status" className="mx-auto mt-7 max-w-3xl rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 p-4 text-sm font-semibold text-yellow-900 dark:text-yellow-200">
            Sebagian data Moodle belum tersedia. Informasi editorial program tetap ditampilkan tanpa menjanjikan akses.
          </div>
        ) : null}
        <ul className="mx-auto mt-8 grid max-w-4xl gap-5">
          {courses.map(course => (
            <li key={course.moodle_course_id}>
              <CourseCard
                title={course.full_name || `Course Moodle #${course.moodle_course_id}`}
                required={course.required}
                availability={course.availability}
                state={course.learner_state === "completed" ? "Selesai" : course.learner_state === "enrolled" ? "Terdaftar" : course.learner_state === "not_enrolled" ? "Belum terdaftar" : undefined}
                summary={course.summary}
                progress={course.progress}
                startUrl={course.start_url}
              />
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs font-semibold text-slate-500">
          Sumber: Moodle · Diperiksa {formatDate(provenance.checked_at)} · {provenance.state === "fresh" ? "Data segar" : "Degradasi parsial"}
        </p>
      </div>
    </section>

    {related && related.length > 0 ? (
      <RelatedContentSection
        eyebrow="Rekomendasi Terkait"
        title="Program Pelatihan Terkait Lainnya"
        viewAllHref="/training-programs"
        viewAllLabel="Lihat Semua Program →"
      >
        {related.map((item) => (
          <TrainingProgramCard
            key={item.id}
            href={`/training-programs/${item.slug}`}
            title={item.title}
            summary={item.summary}
            audience={item.audience}
            courseCount={item.courses?.length || 0}
            cohortStatus={getProgramEnrollmentSummary(item.cohorts)}
          />
        ))}
      </RelatedContentSection>
    ) : null}
  </div>;
}
