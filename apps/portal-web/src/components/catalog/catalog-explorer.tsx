"use client";

/* eslint-disable @next/next/no-img-element -- licensed Techwind assets and local media */
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/portal-icon";
import { EmptyState } from "@/components/techwind";

export type CatalogItem = {
  id: string;
  title: string;
  summary: string;
  format: "program" | "microlearning" | "webinar" | "path";
  formatLabel: string;
  badge: string;
  badgeClass: string;
  href: string;
  image: string;
  duration?: string;
  actionLabel: string;
  level: "beginner" | "intermediate" | "advanced";
  levelLabel: string;
  category?: string;
  tags?: string[];
  rating?: { average: number; totalReviews: number };
  instructor?: { name: string; avatar?: string };
};

export const formatOptions = [
  { value: "", label: "Semua Format", icon: "book" as const },
  { value: "program", label: "Program Pelatihan", icon: "graduation" as const },
  { value: "microlearning", label: "Pembelajaran Mikro", icon: "play" as const },
  { value: "webinar", label: "Webinar", icon: "calendar" as const },
  { value: "path", label: "Jalur Belajar", icon: "star" as const },
];

export const levelOptions = [
  { value: "", label: "Semua Tingkat" },
  { value: "beginner", label: "Pemula" },
  { value: "intermediate", label: "Menengah" },
  { value: "advanced", label: "Mahir" },
];

export const sortOptions = [
  { value: "latest", label: "Terbaru" },
  { value: "rating", label: "Rating Tertinggi" },
  { value: "popular", label: "Terpopuler" },
  { value: "difficulty", label: "Tingkat Kesulitan" },
];

type Props = {
  initialItems: CatalogItem[];
  initialFormat?: string;
  initialCategory?: string;
  initialTag?: string;
  initialLevel?: string;
  initialQuery?: string;
  initialSort?: string;
};

export function CatalogExplorer({
  initialItems,
  initialFormat = "",
  initialCategory = "",
  initialTag = "",
  initialLevel = "",
  initialQuery = "",
  initialSort = "latest",
}: Props) {
  const [selectedFormat, setSelectedFormat] = useState<string>(initialFormat);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [query, setQuery] = useState<string>(initialQuery);

  const syncUrl = useCallback(
    (format: string, level: string, category: string, tag: string, sort: string, q: string) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (format) params.set("format", format);
      if (category) params.set("category", category);
      if (tag) params.set("tag", tag);
      if (level) params.set("level", level);
      if (sort && sort !== "latest") params.set("sort", sort);
      const queryStr = params.toString();
      const newUrl = queryStr ? `/catalog?${queryStr}` : "/catalog";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  const handleFormatChange = useCallback(
    (newFormat: string) => {
      setSelectedFormat(newFormat);
      syncUrl(newFormat, selectedLevel, selectedCategory, selectedTag, selectedSort, query);
    },
    [selectedLevel, selectedCategory, selectedTag, selectedSort, query, syncUrl]
  );

  const handleLevelChange = useCallback(
    (newLevel: string) => {
      setSelectedLevel(newLevel);
      syncUrl(selectedFormat, newLevel, selectedCategory, selectedTag, selectedSort, query);
    },
    [selectedFormat, selectedCategory, selectedTag, selectedSort, query, syncUrl]
  );

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSelectedSort(newSort);
      syncUrl(selectedFormat, selectedLevel, selectedCategory, selectedTag, newSort, query);
    },
    [selectedFormat, selectedLevel, selectedCategory, selectedTag, query, syncUrl]
  );

  const handleCategoryRemove = useCallback(() => {
    setSelectedCategory("");
    syncUrl(selectedFormat, selectedLevel, "", selectedTag, selectedSort, query);
  }, [selectedFormat, selectedLevel, selectedTag, selectedSort, query, syncUrl]);

  const handleTagRemove = useCallback(() => {
    setSelectedTag("");
    syncUrl(selectedFormat, selectedLevel, selectedCategory, "", selectedSort, query);
  }, [selectedFormat, selectedLevel, selectedCategory, selectedSort, query, syncUrl]);

  const handleLevelRemove = useCallback(() => {
    setSelectedLevel("");
    syncUrl(selectedFormat, "", selectedCategory, selectedTag, selectedSort, query);
  }, [selectedFormat, selectedCategory, selectedTag, selectedSort, query, syncUrl]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      syncUrl(selectedFormat, selectedLevel, selectedCategory, selectedTag, selectedSort, newQuery);
    },
    [selectedFormat, selectedLevel, selectedCategory, selectedTag, selectedSort, syncUrl]
  );

  const handleQueryRemove = useCallback(() => {
    setQuery("");
    syncUrl(selectedFormat, selectedLevel, selectedCategory, selectedTag, selectedSort, "");
  }, [selectedFormat, selectedLevel, selectedCategory, selectedTag, selectedSort, syncUrl]);

  const handleResetAll = useCallback(() => {
    setSelectedFormat("");
    setSelectedCategory("");
    setSelectedTag("");
    setSelectedLevel("");
    setSelectedSort("latest");
    setQuery("");
    syncUrl("", "", "", "", "latest", "");
  }, [syncUrl]);

  // Compute metrics from all items
  const metrics = useMemo(() => {
    const programCount = initialItems.filter((i) => i.format === "program").length;
    const microCount = initialItems.filter((i) => i.format === "microlearning").length;
    const webinarCount = initialItems.filter((i) => i.format === "webinar").length;
    const pathCount = initialItems.filter((i) => i.format === "path").length;

    return [
      {
        format: "program",
        title: "Program Pelatihan",
        count: programCount,
        unit: "Program",
        icon: "graduation" as const,
        bgClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
        borderClass: "hover:border-teal-500/50",
      },
      {
        format: "microlearning",
        title: "Pembelajaran Mikro",
        count: microCount,
        unit: "Modul",
        icon: "play" as const,
        bgClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        borderClass: "hover:border-sky-500/50",
      },
      {
        format: "webinar",
        title: "Webinar & Live",
        count: webinarCount,
        unit: "Sesi",
        icon: "calendar" as const,
        bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        borderClass: "hover:border-rose-500/50",
      },
      {
        format: "path",
        title: "Jalur Belajar",
        count: pathCount,
        unit: "Kurikulum",
        icon: "star" as const,
        bgClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        borderClass: "hover:border-indigo-500/50",
      },
    ];
  }, [initialItems]);

  // Filter items in-place
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialItems.filter((item) => {
      if (selectedFormat && item.format !== selectedFormat) return false;
      if (selectedLevel && item.level !== selectedLevel) return false;
      if (selectedCategory && item.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (selectedTag && !item.tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) return false;
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchCategory && !matchTag) return false;
      }
      return true;
    });
  }, [initialItems, selectedFormat, selectedLevel, selectedCategory, selectedTag, query]);

  // Sort items in-place
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (selectedSort === "rating") {
        const aRating = a.rating?.average || 0;
        const bRating = b.rating?.average || 0;
        return bRating - aRating;
      }
      if (selectedSort === "popular") {
        const aCount = a.rating?.totalReviews || 0;
        const bCount = b.rating?.totalReviews || 0;
        if (bCount !== aCount) return bCount - aCount;
        return b.title.localeCompare(a.title);
      }
      if (selectedSort === "difficulty") {
        const weight = { beginner: 1, intermediate: 2, advanced: 3 };
        return weight[a.level] - weight[b.level];
      }
      return 0;
    });
  }, [filteredItems, selectedSort]);

  const hasActiveFilters = Boolean(
    selectedFormat || selectedCategory || selectedTag || selectedLevel || query
  );

  return (
    <>
      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => {
          const isSelected = selectedFormat === m.format;
          return (
            <button
              key={m.format}
              type="button"
              onClick={() => handleFormatChange(isSelected ? "" : m.format)}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-300 text-start w-full cursor-pointer focus:outline-none ${
                isSelected
                  ? "bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-md ring-2 ring-teal-500/30"
                  : `bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 shadow-xs ${m.borderClass} hover:shadow-md`
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-white/20 text-white" : m.bgClass
                }`}
              >
                <PortalIcon name={m.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xl font-extrabold ${
                      isSelected ? "text-white" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {m.count}
                  </span>
                  <span
                    className={`text-[11px] font-medium truncate ${
                      isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {m.unit}
                  </span>
                </div>
                <p
                  className={`text-xs font-bold truncate ${
                    isSelected ? "text-teal-300" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {m.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="w-full md:w-96 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cari pelatihan, topik, atau kata kunci..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-11 pr-10 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
            <PortalIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={handleQueryRemove}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector & Results Counter */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Urutkan:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {sortOptions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleSortChange(s.value)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedSort === s.value
                        ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="text-teal-600 dark:text-teal-400 font-extrabold">{sortedItems.length}</span> materi
            </div>
          </div>
        </div>

        {/* Format Filter Pills (In-Place Interactive Buttons) */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Format:</span>
          {formatOptions.map((opt) => {
            const isActive = selectedFormat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFormatChange(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm ring-1 ring-teal-700/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                <PortalIcon name={opt.icon} className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Level Filter Pills (In-Place Interactive Buttons) */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Tingkat Kesulitan:</span>
          {levelOptions.map((lvl) => {
            const isActive = selectedLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => handleLevelChange(lvl.value)}
                className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs ring-1 ring-primary/50"
                    : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-150 dark:hover:bg-slate-800"
                }`}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>

        {/* Active Dismissible Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">Filter Aktif:</span>

            {selectedFormat && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Format: {formatOptions.find((f) => f.value === selectedFormat)?.label || selectedFormat}
                <button
                  type="button"
                  onClick={() => handleFormatChange("")}
                  className="hover:text-teal-900 dark:hover:text-white font-black ml-0.5 cursor-pointer"
                  title="Hapus filter format"
                >
                  ×
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Kategori: {selectedCategory}
                <button
                  type="button"
                  onClick={handleCategoryRemove}
                  className="hover:text-teal-900 dark:hover:text-white font-black ml-0.5 cursor-pointer"
                  title="Hapus filter kategori"
                >
                  ×
                </button>
              </span>
            )}

            {selectedTag && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Tag: #{selectedTag}
                <button
                  type="button"
                  onClick={handleTagRemove}
                  className="hover:text-sky-900 dark:hover:text-white font-black ml-0.5 cursor-pointer"
                  title="Hapus filter tag"
                >
                  ×
                </button>
              </span>
            )}

            {selectedLevel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Tingkat: {levelOptions.find((l) => l.value === selectedLevel)?.label || selectedLevel}
                <button
                  type="button"
                  onClick={handleLevelRemove}
                  className="hover:text-amber-900 dark:hover:text-white font-black ml-0.5 cursor-pointer"
                  title="Hapus filter tingkat"
                >
                  ×
                </button>
              </span>
            )}

            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Pencarian: &quot;{query}&quot;
                <button
                  type="button"
                  onClick={handleQueryRemove}
                  className="hover:text-slate-900 dark:hover:text-white font-black ml-0.5 cursor-pointer"
                  title="Hapus pencarian"
                >
                  ×
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline ml-2 cursor-pointer"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* Catalog Cards Grid */}
      {sortedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* 16:9 Cover Image with Floating Badges */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Floating Format Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs ${item.badgeClass}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  {/* Floating Level Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-sm shadow-xs">
                      {item.levelLabel}
                    </span>
                  </div>

                  {/* Instructor Overlay on Hover */}
                  {item.instructor ? (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2.5">
                      {item.instructor.avatar ? (
                        <img
                          src={item.instructor.avatar}
                          alt={item.instructor.name}
                          className="w-7 h-7 rounded-full object-cover border border-white/40"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {item.instructor.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white truncate">
                        {item.instructor.name}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Card Content Body */}
                <div className="p-5">
                  {/* Ratings & Duration Strip */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {item.rating && item.rating.average > 0 ? (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-amber-400 font-black">★</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.rating.average.toFixed(1)}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.rating.totalReviews})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {item.formatLabel}
                      </span>
                    )}

                    {item.duration ? (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{item.duration}</span>
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    <Link href={item.href}>
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              </div>

              {/* Card Footer CTA */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.formatLabel}
                </span>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-bold transition-colors shadow-xs"
                >
                  <span>{item.actionLabel}</span>
                  <PortalIcon name="chevron-right" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Tidak Ada Materi Pembelajaran"
          description="Tidak ditemukan materi yang sesuai dengan kombinasi filter dan kata kunci yang Anda pilih. Coba sesuaikan kata kunci atau gunakan tombol di bawah untuk menyetel ulang filter."
          actionLabel="Reset Semua Filter"
          onAction={handleResetAll}
        />
      )}
    </>
  );
}
