"use client";

import { useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/portal-icon";
import { MediaLightbox } from "@/components/techwind";
import type { MediaCollection } from "@/lib/media-gallery";

interface MediaGalleryDetailViewProps {
  collection: MediaCollection;
}

export function MediaGalleryDetailView({ collection }: MediaGalleryDetailViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = collection.items || [];
  const featuredItem = items.find((item) => item.featured) || items[0];

  const lightboxItems = items.map((item) => ({
    id: item.id,
    title: item.caption || item.display_filename || collection.title,
    src: `/media/${encodeURIComponent(item.media_id)}`,
    kind: (collection.kind === "video_hub" ? "video" : "image") as "video" | "image",
    description: item.caption,
  }));

  const openLightboxAtIndex = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const formattedDate = collection.published_at
    ? new Date(collection.published_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Belum ditentukan";

  return (
    <div className="grid lg:grid-cols-12 grid-cols-1 gap-8">
      {/* Kolom Utama (8 Kolom) */}
      <article className="lg:col-span-8">
        {items.length === 0 ? (
          <div className="portal-card p-12 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Media tidak lagi tersedia
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Koleksi tetap tercatat, tetapi seluruh referensinya telah dinonaktifkan.
            </p>
          </div>
        ) : (
          <div>
            {/* Featured Media Showcase */}
            {collection.kind === "image_gallery" ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => openLightboxAtIndex(items.indexOf(featuredItem) !== -1 ? items.indexOf(featuredItem) : 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    openLightboxAtIndex(items.indexOf(featuredItem) !== -1 ? items.indexOf(featuredItem) : 0);
                  }
                }}
                className="group relative block overflow-hidden rounded-xl shadow-md cursor-pointer bg-slate-950 aspect-[16/10]"
                aria-label={`Perbesar gambar ${featuredItem?.caption || collection.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${encodeURIComponent(featuredItem.media_id)}`}
                  alt={featuredItem?.alt_text || featuredItem?.caption || collection.title}
                  className="w-full h-full object-cover duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute bottom-4 right-4 size-11 inline-flex items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg group-hover:bg-primary group-hover:text-white transition duration-300"
                  aria-hidden="true"
                >
                  <PortalIcon name="sparkles" className="h-5 w-5" />
                </span>
                {featuredItem?.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                    <p className="text-sm font-medium">{featuredItem.caption}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl shadow-md bg-slate-950">
                <video
                  controls
                  preload="metadata"
                  className="w-full aspect-video"
                  aria-label={featuredItem?.caption || featuredItem?.display_filename}
                >
                  <source
                    src={`/media/${encodeURIComponent(featuredItem.media_id)}`}
                    type={featuredItem.mime_type}
                  />
                </video>
                {featuredItem?.caption && (
                  <div className="p-4 bg-slate-900 text-white text-sm">
                    {featuredItem.caption}
                  </div>
                )}
                {featuredItem?.transcript && (
                  <details className="border-t border-slate-800 bg-slate-900/90 p-4 text-slate-300">
                    <summary className="cursor-pointer font-bold text-teal-400 hover:text-teal-300">
                      Baca Transkrip Video
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {featuredItem.transcript}
                    </p>
                  </details>
                )}
              </div>
            )}

            {/* Tentang Media Ini */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Tentang media ini
              </h2>
              <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-base space-y-3">
                <p>{collection.summary}</p>
              </div>
            </div>

            {/* Item Tambahan Dalam Koleksi (Jika > 1) */}
            {items.length > 1 && (
              <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Semua Media dalam Koleksi ({items.length})
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Klik untuk memperbesar
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openLightboxAtIndex(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          openLightboxAtIndex(idx);
                        }
                      }}
                      className="group relative block overflow-hidden rounded-lg aspect-square bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                      aria-label={`Lihat media ${idx + 1}: ${item.caption || item.display_filename}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/media/${encodeURIComponent(item.media_id)}`}
                        alt={item.alt_text || item.caption || ""}
                        className="w-full h-full object-cover duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="p-2 rounded-full bg-white/90 text-slate-900 shadow">
                          <PortalIcon name="sparkles" className="h-4 w-4" />
                        </span>
                      </div>
                      {item.featured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-600 text-white shadow">
                          Utama
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </article>

      {/* Sticky Sidebar Informasi Media (4 Kolom) */}
      <aside className="lg:col-span-4" aria-label="Informasi media">
        <div className="sticky top-24 rounded-xl bg-gray-50 dark:bg-slate-800/80 p-6 border border-gray-200/80 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            Informasi Media
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Jenis Koleksi</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                {collection.kind === "image_gallery" ? "Galeri Foto" : "Video Hub"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Jumlah Konten</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                {items.length} file terpublikasi
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Dipublikasikan</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                <time dateTime={collection.published_at || undefined}>{formattedDate}</time>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Kurasi & Lisensi</dt>
              <dd className="mt-1 text-slate-600 dark:text-slate-300">
                Media Internal Teman Belajar
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3">
            {featuredItem && (
              <a
                href={`/media/${encodeURIComponent(featuredItem.media_id)}`}
                target="_blank"
                rel="noreferrer"
                download={featuredItem.display_filename || true}
                className="py-2.5 px-5 w-full inline-flex items-center justify-center gap-2 font-semibold bg-primary hover:bg-primary-700 text-white rounded-md transition duration-300 shadow-sm"
              >
                Unduh Media Utama
              </a>
            )}
            <Link
              href="/media-gallery"
              className="py-2.5 px-5 w-full inline-flex items-center justify-center gap-2 font-semibold border border-primary text-primary hover:bg-primary hover:text-white rounded-md transition duration-300"
            >
              ← Kembali ke Galeri
            </Link>
          </div>
        </div>
      </aside>

      {/* Lightbox Modal */}
      <MediaLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        currentIndex={activeIndex}
        onIndexChange={setActiveIndex}
      />
    </div>
  );
}
