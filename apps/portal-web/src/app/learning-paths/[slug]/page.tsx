import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentCard, DetailHero, DetailSidebar, ErrorState, LearningPathCard, LearningPathStepCard, Progress, RelatedContentSection } from "@/components/techwind";
import { getLearningPath, getLearningPathProgress, getRelatedLearningPaths, isAllowedLearningPathUrl, isLearningPathSlug, type LearningPathItem } from "@/lib/learning-paths";

const kindLabel = { course: "Course Moodle", knowledge: "Pengetahuan", microlearning: "Pembelajaran Singkat", webinar: "Webinar" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isLearningPathSlug(slug)) return { title: "Jalur tidak ditemukan" };
  try {
    const path = await getLearningPath(slug);
    return path ? { title: path.version.title, description: path.version.summary, alternates: { canonical: `/learning-paths/${slug}` } } : { title: "Jalur tidak ditemukan" };
  } catch { return { title: "Jalur Belajar" }; }
}

function Action({ item, label = "Buka materi" }: { item: LearningPathItem; label?: string }) {
  const url = item.url;
  if (!url || !isAllowedLearningPathUrl(url) || item.source_state !== "available") return <span className="portal-button-secondary cursor-not-allowed opacity-60 text-xs sm:text-sm" aria-disabled="true">Belum tersedia</span>;
  return url.startsWith("/") ? <Link href={url} className="portal-button-primary text-xs sm:text-sm py-2 px-4">{label}</Link> : <a href={url} className="portal-button-primary text-xs sm:text-sm py-2 px-4" rel="noopener noreferrer">{label}</a>;
}

export default async function LearningPathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isLearningPathSlug(slug)) notFound();
  let path;
  try { path = await getLearningPath(slug); } catch { return <div className="portal-container py-16"><ErrorState title="Detail Jalur Belajar belum dapat dimuat" /></div>; }
  if (!path) notFound();
  const [learner, related] = await Promise.all([getLearningPathProgress(slug), getRelatedLearningPaths(slug, 3)]);
  const progressByKey = new Map((learner.data?.items || []).map((item) => [item.key, item]));
  const shown = learner.data?.path || path;

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { href: "/learning-paths", label: "Jalur Belajar" },
    { label: shown.version.title },
  ];

  return (
    <div>
      <DetailHero
        pattern="learning-path-detail-hero"
        title={shown.version.title}
        summary={shown.version.summary}
        backHref="/learning-paths"
        backLabel="← Jalur Belajar"
        backgroundImage="/techwind-hero/course/cta.jpg"
        breadcrumbs={breadcrumbs}
        meta={
          <>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Versi {shown.version.number}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {shown.version.items.length} langkah
            </span>
            <span className="rounded-full bg-teal-500/20 text-teal-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Kompetensi terarah
            </span>
          </>
        }
      />
      <main className="portal-container grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="path-steps">
          <ContentCard className="mb-8 p-6 sm:p-8">
            <p className="portal-eyebrow">Roadmap pembelajaran</p>
            <h2 id="path-steps" className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              Tahapan yang Perlu Ditempuh
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {shown.version.description}
            </p>
          </ContentCard>

          <div className="relative pl-1 sm:pl-2">
            <ol className="flex flex-col">
              {shown.version.items.map((item, index) => {
                const progress = progressByKey.get(item.key);
                const unavailable = item.source_state !== "available" || progress?.state === "unavailable";
                const isCompleted = progress?.state === "completed";
                const isNext = learner.data?.next_step?.key === item.key;
                const isLast = index === shown.version.items.length - 1;

                return (
                  <li key={item.id}>
                    <LearningPathStepCard
                      index={index + 1}
                      kindLabel={kindLabel[item.kind]}
                      title={item.label}
                      summary={item.summary}
                      required={item.required}
                      milestone={item.milestone}
                      unavailable={unavailable}
                      locked={Boolean(progress?.locked)}
                      completed={isCompleted}
                      isNext={isNext}
                      isLast={isLast}
                      prerequisites={item.prerequisite_keys}
                      progress={
                        progress
                          ? {
                              value: progress.progress,
                              label: `${progress.state.replaceAll("_", " ")} · ${Math.round(progress.progress)}%`,
                            }
                          : undefined
                      }
                      action={
                        progress?.locked ? (
                          <span
                            className="portal-button-secondary cursor-not-allowed opacity-60 text-xs sm:text-sm py-2 px-4"
                            aria-disabled="true"
                          >
                            Selesaikan prerequisite
                          </span>
                        ) : (
                          <Action item={item} label={isCompleted ? "Pelajari lagi" : isNext ? "Mulai langkah ini" : "Buka materi"} />
                        )
                      }
                    />
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <div className="self-start lg:sticky lg:top-24">
          <DetailSidebar
            factsTitle="Informasi Jalur"
            facts={[
              { icon: "book", label: "Jumlah Tahapan", value: `${shown.version.items.length} Langkah` },
              { icon: "graduation", label: "Versi Kurikulum", value: `Versi ${shown.version.number}` },
              { icon: "shield", label: "Tipe Jalur", value: "Kompetensi Terarah" },
            ]}
            people={[
              {
                name: "Tim Kurikulum Teman Belajar",
                role: "Penyusun Jalur Belajar",
                organization: "Teman Belajar Academy",
              },
            ]}
          >
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="portal-eyebrow">Progres Saya</p>
              {!learner.authenticated ? (
                <div className="mt-3">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Masuk untuk Melihat Progres
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Versi jalur akan dikunci saat pertama kali dibuka setelah login.
                  </p>
                  <Link
                    href="/api/auth/signin"
                    className="portal-button-primary mt-4 w-full text-center"
                  >
                    Masuk Sekarang
                  </Link>
                </div>
              ) : !learner.data ? (
                <div className="mt-3">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Progres Belum Tersedia
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Anda tetap dapat melihat urutan dan sumber materi yang tersedia.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {Math.round(learner.data.progress_percent)}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">selesai</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {learner.data.completed_items} dari {learner.data.total_items} langkah tuntas.
                  </p>
                  <Progress
                    value={learner.data.progress_percent}
                    label="Progres jalur belajar"
                    showValue={false}
                  />
                  {learner.data.next_step ? (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        Langkah berikutnya
                      </p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                        {learner.data.next_step.label}
                      </p>
                      <div className="mt-3">
                        <Action item={learner.data.next_step} label="Lanjutkan Sekarang →" />
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] leading-4 text-slate-500">
                    Course: Moodle · Materi editorial: Portal · Webinar: {learner.data.provenance.webinar || "degraded"}
                  </p>
                </div>
              )}
            </div>
          </DetailSidebar>
        </div>
      </main>

      {related && related.length > 0 ? (
        <RelatedContentSection
          eyebrow="Rekomendasi Terkait"
          title="Jalur Belajar Terkait Lainnya"
          viewAllHref="/learning-paths"
          viewAllLabel="Lihat Semua Jalur →"
        >
          {related.map((item) => (
            <LearningPathCard
              key={item.id}
              href={`/learning-paths/${item.slug}`}
              title={item.version.title}
              summary={item.version.summary}
              version={item.version.number}
              itemCount={item.version.items.length}
              publishedAt={item.version.published_at}
            />
          ))}
        </RelatedContentSection>
      ) : null}
    </div>
  );
}
