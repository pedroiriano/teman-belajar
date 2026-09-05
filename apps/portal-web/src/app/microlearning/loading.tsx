import { PageHeroSkeleton, CatalogGridSkeleton, MicrolearningCardSkeleton } from "@/components/techwind";

export default function MicrolearningLoading() {
  return (
    <main className="min-h-screen pb-20">
      <PageHeroSkeleton />
      <div className="portal-container py-10 sm:py-14">
        <div className="mb-6 h-14 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="mb-8 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <CatalogGridSkeleton count={6} renderItem={() => <MicrolearningCardSkeleton />} />
      </div>
    </main>
  );
}
