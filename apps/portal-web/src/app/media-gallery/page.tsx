/* eslint-disable @next/next/no-img-element -- public media uses the authenticated, policy-enforced media route */
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, ErrorState, FullScreenHero, Pagination, TabFilters } from "@/components/techwind";
import {
  listMediaCollections,
  type MediaCollectionKind,
} from "@/lib/media-gallery";

export const metadata: Metadata = {
  title: "Galeri Media & Video Hub",
  description:
    "Galeri foto dan video pembelajaran terkurasi dari Teman Belajar.",
  alternates: { canonical: "/media-gallery" },
};
const labels: Record<MediaCollectionKind, string> = {
  image_gallery: "Galeri foto",
  video_hub: "Video Hub",
};
const tabOptions = [
  { value: "", label: "Semua" },
  { value: "image_gallery", label: "Galeri Foto" },
  { value: "video_hub", label: "Video Hub" },
];
function href(query: string, kind: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (kind) params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  return `/media-gallery${params.size ? `?${params}` : ""}`;
}
export default async function MediaGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const query = (raw.q || "").trim().slice(0, 100);
  const kind = ["image_gallery", "video_hub"].includes(raw.kind || "")
    ? raw.kind || ""
    : "";
  const page = Math.max(1, Number.parseInt(raw.page || "1", 10) || 1);
  const result = await listMediaCollections(query, kind, page);
  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Galeri Media & Video Hub" },
  ];
  return (
    <div>
      <FullScreenHero
        title="Galeri Media & Video Hub"
        description="Dokumentasi kegiatan, materi infografis, dan video pembelajaran terkurasi dari Teman Belajar."
        backgroundImage="/techwind-hero/portfolio/bg-inner.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      >
        <Link
          href="#catalog"
          className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md"
        >
          Lihat Koleksi
        </Link>
      </FullScreenHero>
      <section id="catalog" className="portal-container py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4">
          <form
            role="search"
            action="/media-gallery"
            className="portal-card p-5"
          >
            <label className="portal-label" htmlFor="gallery-search">
              Cari koleksi
            </label>
            <input
              id="gallery-search"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={query}
              className="portal-search-input mt-2 w-full"
              placeholder="Cari judul atau deskripsi koleksi"
            />
          </form>
          <TabFilters options={tabOptions} paramName="kind" basePath="/media-gallery" />
        </div>
        {result.error ? (
          <div className="mt-8">
            <ErrorState title="Galeri belum dapat dimuat" />
          </div>
        ) : result.data.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Belum ada koleksi terbit"
              description="Koleksi yang telah melewati peninjauan akan tampil di sini."
            />
          </div>
        ) : (
          <>
            <div className="mb-6 mt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="portal-eyebrow">Koleksi Publik</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  Media pilihan
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Menampilkan {result.data.length} dari {result.total} koleksi media tersedia
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {result.data.map((collection) => {
                const cover =
                  collection.items.find((item) => item.featured) ||
                  collection.items[0];
                return (
                  <article
                    key={collection.id}
                    className="portal-card overflow-hidden"
                  >
                    {cover ? (
                      <div className="flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-teal-700 to-sky-700">
                        {collection.kind === "image_gallery" ? (
                          <img
                            src={`/media/${cover.media_id}`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-black text-white">
                            Putar Video
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-slate-100 text-sm font-bold text-slate-500">
                        Media tidak tersedia
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex gap-2">
                        <span className="portal-badge">
                          {labels[collection.kind]}
                        </span>
                        {collection.featured ? (
                          <span className="portal-badge">Unggulan</span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-xl font-black text-slate-900">
                        <Link
                          href={`/media-gallery/${collection.slug}`}
                          className="hover:text-teal-700"
                        >
                          {collection.title}
                        </Link>
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {collection.summary}
                      </p>
                      <Link
                        href={`/media-gallery/${collection.slug}`}
                        className="mt-5 inline-block font-extrabold text-teal-700"
                      >
                        Lihat koleksi →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            <Pagination
              pagination={result}
              path="/media-gallery"
              label="Paginasi koleksi"
              getHref={(nextPage) => href(query, kind, nextPage)}
            />
          </>
        )}
      </section>
    </div>
  );
}
