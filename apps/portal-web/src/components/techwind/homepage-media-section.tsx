"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TechwindPortfolioCard } from "./index";

export interface HomepageMediaItem {
  id: string;
  slug: string;
  title: string;
  kind: string; // "image_gallery" | "video_hub" | etc.
  image: string;
}

interface HomepageMediaSectionProps {
  mediaItems: HomepageMediaItem[];
  sectionProps?: Record<string, any>;
}

const tabs = [
  { key: "all", label: "Semua" },
  { key: "image_gallery", label: "Foto" },
  { key: "video_hub", label: "Video" },
] as const;

type MediaTabKey = (typeof tabs)[number]["key"];

export function HomepageMediaSection({
  mediaItems = [],
  sectionProps = {},
}: HomepageMediaSectionProps) {
  const [activeTab, setActiveTab] = useState<MediaTabKey>("all");

  const filteredItems = useMemo(() => {
    if (activeTab === "all") {
      return mediaItems.slice(0, 5);
    }
    const matching = mediaItems.filter((item) => item.kind === activeTab);
    return matching.slice(0, 5);
  }, [mediaItems, activeTab]);

  const seeAllHref = useMemo(() => {
    if (activeTab === "all") return "/media-gallery";
    return `/media-gallery?kind=${activeTab}`;
  }, [activeTab]);

  return (
    <section
      {...sectionProps}
      className="relative md:py-24 py-16 bg-white dark:bg-slate-900"
      id="media"
    >
      <div className="container relative">
        <div className="grid grid-cols-1 pb-8 text-center">
          <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
            Media &amp; Galeri
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Dokumentasi kegiatan dan galeri media kami.
          </p>
        </div>

        {/* Interactive In-Place Pills Tab */}
        <div className="flex justify-center mb-6">
          <ul className="mb-0 list-none flex items-center gap-4" role="tablist" aria-label="Kategori Media">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <li
                  key={tab.key}
                  className={`inline-block font-semibold text-base cursor-pointer relative transition-all duration-300 pb-1 ${
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-slate-400 hover:text-primary duration-500"
                  }`}
                  role="presentation"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className="cursor-pointer focus:outline-none bg-transparent border-0 p-0 font-inherit"
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Media Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid lg:grid-cols-5 md:grid-cols-3 grid-cols-2 gap-4 mt-6">
            {filteredItems.map((media) => (
              <TechwindPortfolioCard
                key={media.id}
                href={`/media-gallery/${media.slug}`}
                image={media.image}
                title={media.title}
                subtitle={media.kind === "video_hub" ? "Video Hub" : "Galeri Foto"}
                aspect="aspect-square"
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 max-w-md mx-auto">
            <p className="text-sm text-slate-400">
              Belum ada koleksi {activeTab === "video_hub" ? "video" : "foto"} yang tersedia.
            </p>
          </div>
        )}

        {/* Link to Full Catalog */}
        <div className="mt-8 text-center">
          <Link
            className="py-2 px-5 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm"
            href={seeAllHref}
          >
            <span>Selengkapnya</span>
            <i className="ri-arrow-right-line align-middle text-lg" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
