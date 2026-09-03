import type { Metadata } from "next";
import Link from "next/link";

import {
  EmptyState,
  ErrorState,
  FilterBar,
  FullScreenHero,
  Pagination,
  SearchField,
  TabFilters,
  TrainingProgramCard,
} from "@/components/techwind";
import { getProgramEnrollmentSummary, listTrainingPrograms } from "@/lib/training-programs";

export const metadata: Metadata = {
  title: "Pelatihan Penuh",
  description: "Temukan program pelatihan terstruktur di Teman Belajar.",
  alternates: { canonical: "/training-programs" },
};

const statusFilterOptions = [
  { value: "", label: "Semua Status" },
  { value: "open", label: "Pendaftaran Dibuka" },
  { value: "upcoming", label: "Segera Dibuka" },
  { value: "closed", label: "Pendaftaran Ditutup" },
];

function href(query: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  return `/training-programs${params.size ? `?${params}` : ""}`;
}

export default async function TrainingProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().slice(0, 100);
  const status = (raw.status || "").trim();
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listTrainingPrograms(query, page);

  const filteredPrograms = result.data.filter((program) => {
    if (!status) return true;
    const summary = getProgramEnrollmentSummary(program.cohorts);
    if (status === "open") return summary.label === "Pendaftaran Dibuka" || summary.label === "Jadwal Aktif";
    if (status === "upcoming") return summary.label === "Segera Dibuka";
    if (status === "closed") return summary.label === "Pendaftaran Ditutup" || summary.label === "Jadwal Belum Dibuka";
    return true;
  });

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Pelatihan Penuh" },
  ];

  return (
    <div>
      <FullScreenHero
        title="Pelatihan Penuh"
        description="Jelajahi rangkaian course formal, jadwal cohort, dan progres yang terintegrasi secara andal dari Moodle."
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
        <FilterBar
          role="search"
          className="mb-6 flex flex-col gap-3 p-4 sm:flex-row"
          action="/training-programs"
        >
          <SearchField
            id="training-search"
            name="q"
            label="Cari program pelatihan"
            maxLength={100}
            defaultValue={query}
            required={false}
            placeholder="Cari judul, ringkasan, atau sasaran peserta"
            inputClassName="min-h-11 !rounded-xl !pl-12"
            className="flex-1"
          />
          <button type="submit" className="portal-button-primary min-h-11">
            Cari program
          </button>
          {query || status ? (
            <Link
              href="/training-programs"
              className="portal-button-secondary min-h-11"
            >
              Hapus filter
            </Link>
          ) : null}
        </FilterBar>

        {/* Tab Filters for Cohort Status */}
        <div className="mb-8">
          <TabFilters options={statusFilterOptions} paramName="status" basePath="/training-programs" />
        </div>

        {result.error ? (
          <ErrorState title="Katalog program belum dapat dimuat" />
        ) : filteredPrograms.length === 0 ? (
          <EmptyState
            title={query || status ? "Program tidak ditemukan" : "Belum ada program terbit"}
            description={
              query || status
                ? "Coba gunakan kata kunci atau status filter lain."
                : "Program yang telah ditinjau dan diterbitkan akan tampil di sini."
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="portal-eyebrow">Katalog Program</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {query ? `Hasil untuk “${query}”` : "Pelatihan yang tersedia"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Menampilkan {filteredPrograms.length} dari {result.pagination.total} program pelatihan tersedia
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredPrograms.map((program) => (
                <TrainingProgramCard
                  key={program.id}
                  href={`/training-programs/${program.slug}`}
                  title={program.title}
                  summary={program.summary}
                  audience={program.audience}
                  courseCount={program.courses?.length || 0}
                  cohortStatus={getProgramEnrollmentSummary(program.cohorts)}
                />
              ))}
            </div>

            <Pagination
              pagination={result.pagination}
              path="/training-programs"
              getHref={(nextPage) => href(query, status, nextPage)}
            />
          </>
        )}
      </section>
    </div>
  );
}
