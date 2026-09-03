import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FullScreenHero } from "@/components/techwind";
import { MediaGalleryDetailView } from "@/components/media-gallery-detail-view";
import { StructuredData } from "@/components/structured-data";
import { getMediaCollection } from "@/lib/media-gallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getMediaCollection(slug);
  if (!collection)
    return {
      title: "Koleksi tidak ditemukan",
      robots: { index:false, follow: false },
    };
  return {
    title: collection.seo_title || collection.title,
    description: collection.seo_description || collection.summary,
    alternates: { canonical: `/media-gallery/${collection.slug}` },
    robots: { index: collection.indexable, follow: collection.indexable },
  };
}

export default async function MediaGalleryDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getMediaCollection(slug);
  if (!collection) notFound();
  const publicBase =
    process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000";

  const featuredItem =
    collection.items.find((item) => item.featured) || collection.items[0];
  const backgroundImage = featuredItem
    ? `/media/${encodeURIComponent(featuredItem.media_id)}`
    : "/techwind-hero/portfolio/bg-inner.jpg";

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { href: "/media-gallery", label: "Galeri Media" },
    { label: collection.title },
  ];

  return (
    <article>
      <StructuredData
        value={{
          "@context": "https://schema.org",
          "@type":
            collection.kind === "image_gallery"
              ? "ImageGallery"
              : "CollectionPage",
          name: collection.title,
          description: collection.summary,
          url: `${publicBase}/media-gallery/${collection.slug}`,
          numberOfItems: collection.items.length,
        }}
      />
      <FullScreenHero
        title={collection.title}
        description={collection.summary}
        backgroundImage={backgroundImage}
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-teal-700 rounded-full">
            {collection.kind === "image_gallery" ? "Galeri Foto" : "Video Hub"}
          </span>
          {collection.published_at && (
            <span className="text-white/80 text-sm font-medium">
              {new Date(collection.published_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </FullScreenHero>

      <section className="portal-container py-12 sm:py-16">
        <MediaGalleryDetailView collection={collection} />
      </section>
    </article>
  );
}
