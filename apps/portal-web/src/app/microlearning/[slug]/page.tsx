import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb, ContentCard, DetailSidebar, ErrorState, MicrolearningDetailHero, MicrolearningCard, RelatedContentSection } from "@/components/techwind";
import { MicrolearningState } from "@/components/microlearning/microlearning-state";
import { StructuredData } from "@/components/structured-data";
import { absolutePublicUrl } from "@/lib/discovery/types";
import { getMicrolearning, getMicrolearningLearnerState, isAllowedMicrolearningVideoUrl, isMicrolearningSlug } from "@/lib/microlearning";

const labels = { article: "Artikel", video: "Video", quick: "Quick learning" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isMicrolearningSlug(slug)) return { title: "Materi tidak ditemukan" };
  try {
    const item = await getMicrolearning(slug);
    if (!item) return { title: "Materi tidak ditemukan" };
    return { title: item.seo_title || item.title, description: item.seo_description || item.summary, alternates: { canonical: `/microlearning/${item.slug}` }, robots: item.indexable ? { index: true, follow: true } : { index: false, follow: true }, openGraph: { type: "article", title: item.seo_title || item.title, description: item.seo_description || item.summary, images: item.featured_media_id ? [{ url: `/media/${encodeURIComponent(item.featured_media_id)}`, alt: item.title }] : undefined } };
  } catch { return { title: "Pembelajaran Singkat" }; }
}

export default async function MicrolearningDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isMicrolearningSlug(slug)) notFound();
  let item;
  try { item = await getMicrolearning(slug); } catch { return <div className="portal-container py-16"><ErrorState title="Detail Pembelajaran Singkat belum dapat dimuat" /></div>; }
  if (!item) notFound();
  const learner = await getMicrolearningLearnerState(item.id);
  const canonical = absolutePublicUrl(`/microlearning/${item.slug}`);
  const playableVideo = item.format === "video" && isAllowedMicrolearningVideoUrl(item.video_url) ? item.video_url : undefined;

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { href: "/microlearning", label: "Pembelajaran Singkat" },
    { label: item.title },
  ];

  return (
    <div>
      <StructuredData
        value={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: item.title,
          description: item.summary,
          url: canonical,
          timeRequired: `PT${item.duration_minutes}M`,
          learningResourceType: labels[item.format],
          isAccessibleForFree: true,
        }}
      />
      <MicrolearningDetailHero
        title={item.title}
        summary={item.summary}
        backHref="/microlearning"
        backLabel="← Pembelajaran Singkat"
        formatLabel={labels[item.format]}
        durationMinutes={item.duration_minutes}
        featuredMediaId={item.featured_media_id}
        backgroundImage="/techwind-hero/blog.jpg"
        breadcrumbs={breadcrumbs}
      />
    <section className="portal-container grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ContentCard id="microlearning-content" tabIndex={-1} className="p-6 sm:p-8"><p className="portal-eyebrow">Materi pembelajaran</p>{item.format === "video" && playableVideo ? <video controls preload="metadata" src={playableVideo} className="mt-5 aspect-video w-full rounded-2xl bg-slate-950" aria-label={`Video ${item.title}`}>Browser Anda tidak mendukung pemutar video. <a href={playableVideo}>Buka video</a>.</video> : item.format === "video" ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600"><strong className="text-slate-900">Media video belum tersedia.</strong><p className="mt-1">Materi teks tetap dapat dibaca dari halaman ini.</p></div> : null}<div className="mt-7 whitespace-pre-line text-base leading-8 text-slate-700">{item.body}</div></ContentCard>
      <div className="self-start lg:sticky lg:top-24">
        <DetailSidebar
          factsTitle="Informasi Materi"
          facts={[
            { icon: "book", label: "Format Materi", value: labels[item.format] },
            { icon: "calendar", label: "Estimasi Durasi", value: `${item.duration_minutes} Menit` },
            { icon: "shield", label: "Tipe Belajar", value: "Mandiri / Asynchronous" },
          ]}
          people={[
            {
              name: "Redaksi Teman Belajar",
              role: "Tim Kurasi Pembelajaran Singkat",
              organization: "Teman Belajar Editorial",
            },
          ]}
        >
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            {learner.authenticated ? (
              <MicrolearningState
                itemId={item.id}
                format={item.format}
                durationMinutes={item.duration_minutes}
                initialProgress={learner.progress}
                initialBookmarked={learner.bookmarked}
              />
            ) : (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Simpan posisi belajar</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Masuk untuk bookmark dan melanjutkan materi dari posisi terakhir.</p>
                <Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/microlearning/${slug}`)}`} className="portal-button-primary mt-4 w-full text-center">Masuk</Link>
              </div>
            )}
          </div>
        </DetailSidebar>
      </div>
    </section>
      {item.related.length ? (
        <RelatedContentSection
          eyebrow="Rekomendasi Terkait"
          title="Materi Terkait Lainnya"
          viewAllHref="/microlearning"
          viewAllLabel="Lihat Semua Materi →"
        >
          {item.related.map((related) => (
            <MicrolearningCard
              key={related.id}
              href={`/microlearning/${related.slug}`}
              title={related.title}
              summary={related.summary}
              formatLabel={labels[related.format]}
              durationMinutes={related.duration_minutes}
            />
          ))}
        </RelatedContentSection>
      ) : null}
    </div>
  );
}
