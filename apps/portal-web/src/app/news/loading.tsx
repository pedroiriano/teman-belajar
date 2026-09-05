import { PageHeroSkeleton, CatalogGridSkeleton, TechwindNewsCardSkeleton } from "@/components/techwind";

export default function NewsLoading() {
  return (
    <main className="min-h-screen pb-20">
      <PageHeroSkeleton />
      <div className="portal-container py-12 sm:py-16">
        <CatalogGridSkeleton count={6} renderItem={() => <TechwindNewsCardSkeleton />} />
      </div>
    </main>
  );
}
