import type { ReactNode } from "react";

export function TechwindCourseCardSkeleton() {
  return (
    <div
      className="rounded-2xl shadow-sm overflow-hidden bg-white dark:bg-[#111a2e] border border-slate-200/80 dark:border-slate-800 animate-pulse flex flex-col h-full"
      role="status"
      aria-label="Memuat kursus..."
    >
      <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800 w-full" />
      <div className="p-6 flex flex-col flex-1 space-y-3.5">
        <div className="h-3 w-20 bg-teal-100 dark:bg-teal-950/50 rounded" />
        <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="space-y-2 pt-1 grow">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function MicrolearningCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-pulse flex flex-col h-full"
      role="status"
      aria-label="Memuat materi singkat..."
    >
      <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800 w-full" />
      <div className="p-6 flex flex-col flex-1 space-y-3.5">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-teal-100 dark:bg-teal-950/40 rounded-full" />
          <div className="h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="space-y-2 pt-1 grow">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function LearningPathCardSkeleton() {
  return (
    <div
      className="p-6 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse flex flex-col h-full space-y-4"
      role="status"
      aria-label="Memuat jalur belajar..."
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-teal-100 dark:bg-teal-950/40 rounded-full" />
          <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="space-y-2 grow">
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

export function TechwindNewsCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row gap-5 shadow-sm animate-pulse"
      role="status"
      aria-label="Memuat berita..."
    >
      <div className="w-full sm:w-44 aspect-[16/10] sm:aspect-auto sm:h-32 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-3 w-24 bg-teal-100 dark:bg-teal-950/40 rounded" />
        <div className="h-5 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded pt-1" />
      </div>
    </div>
  );
}

export function PageHeroSkeleton({
  eyebrow = "Memuat...",
  title = "Menyiapkan Materi Pembelajaran",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <header className="portal-page-hero" data-techwind-pattern="course-inner-hero">
      <div className="portal-page-hero-orb portal-page-hero-orb-one" aria-hidden="true" />
      <div className="portal-page-hero-orb portal-page-hero-orb-two" aria-hidden="true" />
      <div className="portal-container relative py-12 sm:py-16">
        <p className="portal-eyebrow animate-pulse">{eyebrow}</p>
        <h1 className="portal-page-hero-title mt-2 animate-pulse">{title}</h1>
        <div className="mt-4 h-4 max-w-xl bg-teal-900/20 dark:bg-teal-400/10 rounded animate-pulse" />
      </div>
    </header>
  );
}

export function CatalogGridSkeleton({
  count = 6,
  renderItem = () => <TechwindCourseCardSkeleton />,
}: {
  count?: number;
  renderItem?: (idx: number) => ReactNode;
}) {
  return (
    <div className="portal-container py-10 sm:py-14">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx}>{renderItem(idx)}</div>
        ))}
      </div>
    </div>
  );
}
