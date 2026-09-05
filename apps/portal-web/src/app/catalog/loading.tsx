import { PageHeroSkeleton, CatalogGridSkeleton, TechwindCourseCardSkeleton } from "@/components/techwind";

export default function CatalogLoading() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <PageHeroSkeleton />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="mb-8 space-y-4">
          <div className="h-12 w-full max-w-xl bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <CatalogGridSkeleton count={6} renderItem={() => <TechwindCourseCardSkeleton />} />
      </div>
    </main>
  );
}
