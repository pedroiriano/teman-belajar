/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type HomepageSearchItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  image: string;
  domain: "course" | "training" | "microlearning" | "webinar" | "learningPath" | "news" | "announcement";
  domainLabel: string;
  detailUrl: string;
  actionLabel: string;
  badge: string;
  metaValue?: string;
};

const domainOptions = [
  { key: "all", label: "Semua", paramValue: "" },
  { key: "course", label: "Kelas", paramValue: "course" },
  { key: "training", label: "Pelatihan Penuh", paramValue: "training" },
  { key: "microlearning", label: "Pembelajaran Singkat", paramValue: "microlearning" },
  { key: "webinar", label: "Webinar", paramValue: "webinar" },
  { key: "learningPath", label: "Jalur Belajar", paramValue: "learningPath" },
  { key: "news", label: "Berita", paramValue: "news" },
  { key: "announcement", label: "Pengumuman", paramValue: "announcement" },
] as const;

export function HomepageSearchSection({
  initialItems = [],
  totalAvailableCount = 52,
}: {
  initialItems: HomepageSearchItem[];
  totalAvailableCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("all");

  const filteredItems = useMemo(() => {
    let result = initialItems;
    if (activeDomain !== "all") {
      result = result.filter((item) => item.domain === activeDomain);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.domainLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [initialItems, activeDomain, query]);

  const displayedItems = filteredItems.slice(0, 6);

  const activeOption = domainOptions.find((opt) => opt.key === activeDomain);
  const seeAllHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeOption && activeOption.paramValue) {
      params.set("content_type", activeOption.paramValue);
    }
    return `/search${params.size ? `?${params.toString()}` : ""}`;
  }, [query, activeOption]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push(seeAllHref);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Search Form Card */}
      <form
        id="cari"
        onSubmit={handleSubmit}
        action="/search"
        method="GET"
        role="search"
        className="bg-white dark:bg-[#111a2e] rounded-2xl shadow-sm dark:shadow-gray-900/40 p-5 md:p-6 border border-slate-200/80 dark:border-slate-800"
      >
        <input
          name="content_type"
          type="hidden"
          value={activeOption?.paramValue || ""}
        />
        <label
          className="font-bold text-sm mb-2 block text-slate-900 dark:text-white"
          htmlFor="site-search-query"
        >
          Cari berdasarkan topik atau kompetensi
        </label>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="size-5 absolute top-1/2 -translate-y-1/2 left-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="site-search-query"
              name="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Contoh: keamanan informasi, analisis data, atau kepemimpinan"
              className="form-input w-full py-3 h-12 bg-slate-50/50 dark:bg-[#090e17] text-slate-900 dark:text-slate-100 rounded-xl outline-none border border-slate-200 focus:border-primary dark:border-slate-700 dark:focus:border-primary focus:ring-0 pl-12 pr-4 text-sm transition-colors"
            />
          </div>
          <button
            type="submit"
            className="py-3 px-7 md:w-48 h-12 inline-flex gap-2 items-center justify-center font-bold tracking-wide duration-500 text-base bg-primary hover:bg-primary-700 border border-primary hover:border-primary-700 text-white rounded-xl transition-all shrink-0 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <svg
              className="size-4.5 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span>Cari</span>
          </button>
        </div>
        <p className="text-slate-400 text-sm mt-3" id="site-search-help">
          Gunakan kata kunci topik, kompetensi, atau format pembelajaran.
        </p>
      </form>

      {/* Filter Pills */}
      <div
        className="mt-8 flex flex-wrap gap-2"
        aria-label="Filter jenis konten"
        role="group"
      >
        {domainOptions.map((opt) => {
          const isActive = activeDomain === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveDomain(opt.key)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "px-4 py-2 rounded-full border border-primary bg-primary text-white text-sm font-bold duration-300 shadow-sm transition-all"
                  : "px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111a2e] text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:border-primary dark:hover:border-primary text-sm font-semibold duration-300 shadow-xs transition-colors"
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Results Status Line */}
      <p
        className="mt-4 text-left text-slate-600 dark:text-slate-300 text-sm font-medium"
        role="status"
        aria-live="polite"
      >
        {displayedItems.length > 0
          ? `Menampilkan ${displayedItems.length} dari ${totalAvailableCount} konten tersedia`
          : "0 konten ditemukan"}
      </p>

      {/* Results Grid OR Empty State Placeholder */}
      <div className="mt-6">
        {displayedItems.length > 0 ? (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
            {displayedItems.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden bg-white dark:bg-[#111a2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl dark:shadow-gray-900/50 hover:-translate-y-1.5 duration-500 transition-all group"
              >
                <Link className="block overflow-hidden" href={item.detailUrl}>
                  <img
                    className="w-full h-48 object-cover group-hover:scale-105 duration-500"
                    src={item.image}
                    alt={`Ilustrasi ${item.title}`}
                  />
                </Link>
                <div className="p-5 flex flex-col grow">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {item.domainLabel}
                    </span>
                    {item.metaValue ? (
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium text-end">
                        {item.metaValue}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-300">
                    <Link href={item.detailUrl}>{item.title}</Link>
                  </h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm grow line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{item.badge}</span>
                    <Link
                      className="inline-flex items-center font-bold text-primary text-sm group-hover:translate-x-1.5 duration-500 transition-transform"
                      href={item.detailUrl}
                    >
                      <span>{item.actionLabel}</span>
                      <svg
                        className="size-4 inline-block ms-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Empty State Placeholder Card */
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <svg
                className="size-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Belum ada hasil yang cocok
            </h3>
            <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Coba gunakan kata kunci yang lebih umum atau tampilkan kembali semua
              jenis konten.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setActiveDomain("all");
                  setQuery("");
                }}
                className="py-2.5 px-6 font-semibold border border-primary text-primary hover:bg-primary hover:text-white rounded-lg duration-300 transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Atur Ulang Pencarian</span>
              </button>
            </div>
          </div>
        )}

        {/* Button Lihat Semua Hasil */}
        <div className="mt-8 text-center">
          <Link
            className="py-2.5 px-6 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm group"
            href={seeAllHref}
          >
            <span>Lihat Semua Hasil</span>
            <svg
              className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
