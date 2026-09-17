import type { Metadata } from "next";
import Link from "next/link";

import {
  ErrorState,
  FullScreenHero,
} from "@/components/techwind";
import {
  TrainingProgramsExplorer,
  type TrainingProgramItem,
} from "@/components/training-programs/training-programs-explorer";
import {
  getProgramEnrollmentSummary,
  listTrainingProgramsWithReviews,
  type EnrichedTrainingProgram,
} from "@/lib/training-programs";

export const metadata: Metadata = {
  title: "Pelatihan Penuh",
  description: "Temukan program pelatihan terstruktur di Teman Belajar.",
  alternates: { canonical: "/training-programs" },
};

export default async function TrainingProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    topic?: string;
    level?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const raw = await searchParams;
  const result = await listTrainingProgramsWithReviews("", 1);

  const programs: TrainingProgramItem[] = (result.data || []).map((prog: EnrichedTrainingProgram) => ({
    id: prog.id,
    slug: prog.slug,
    title: prog.title,
    summary: prog.summary,
    audience: prog.audience,
    courseCount: prog.courses?.length || 0,
    cohortStatus: getProgramEnrollmentSummary(prog.cohorts),
    visual: prog.visual,
    tags: prog.tags || [],
    rating: prog.rating,
  }));

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Pelatihan Penuh" },
  ];

  return (
    <div>
      <FullScreenHero
        title="Pelatihan Penuh"
        description="Jelajahi rangkaian course formal, kurikulum terstruktur, jadwal cohort, dan sertifikasi terintegrasi secara andal dari Moodle."
        backgroundImage="/techwind-hero/course/cta.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      >
        <Link
          href="#catalog"
          className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md"
        >
          Lihat Katalog Program
        </Link>
      </FullScreenHero>

      <section id="catalog" className="portal-container py-10 sm:py-14">
        {result.error ? (
          <ErrorState title="Katalog program belum dapat dimuat" />
        ) : (
          <TrainingProgramsExplorer
            initialPrograms={programs}
            initialQuery={raw.q || ""}
            initialStatus={raw.status || ""}
            initialTopic={raw.topic || ""}
            initialLevel={raw.level || ""}
            initialSort={raw.sort || "latest"}
          />
        )}
      </section>
    </div>
  );
}
