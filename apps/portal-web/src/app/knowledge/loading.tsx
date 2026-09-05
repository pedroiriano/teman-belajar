import { PageHeroSkeleton, TechwindNewsCardSkeleton } from "@/components/techwind";

export default function KnowledgeLoading() {
  return (
    <main className="min-h-screen pb-20">
      <PageHeroSkeleton />
      <div className="portal-container py-10 sm:py-14">
        <div className="mb-8 h-16 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_14rem] lg:items-start">
          <div className="hidden lg:block space-y-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" style={{ width: `${80 - i * 8}%` }} />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <TechwindNewsCardSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="hidden lg:block h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
