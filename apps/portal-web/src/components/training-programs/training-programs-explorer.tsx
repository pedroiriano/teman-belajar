"use client";

import { useCallback, useMemo, useState } from "react";
import {
  EmptyState,
  TrainingProgramCard,
} from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";

export type TrainingProgramItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience?: string;
  courseCount: number;
  cohortStatus: {
    hasOpenCohort: boolean;
    label: string;
    className: string;
  };
  visual: {
    image: string;
    category: string;
    level: "Pemula" | "Menengah" | "Mahir";
    instructor: { name: string; avatar?: string; role?: string };
    durationLabel: string;
  };
  tags?: string[];
  rating?: { average: number; totalReviews: number };
};

const statusFilterOptions = [
  { value: "", label: "Semua Status" },
  { value: "open", label: "Pendaftaran Dibuka" },
  { value: "upcoming", label: "Segera Dibuka" },
  { value: "closed", label: "Pendaftaran Ditutup" },
];

const topicFilterOptions = [
  { value: "", label: "Semua Topik" },
  { value: "Aplikasi Perkantoran", label: "Aplikasi Perkantoran" },
  { value: "Cloud & DevOps", label: "Cloud & DevOps" },
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Data & AI", label: "Data & AI" },
  { value: "Keamanan Siber", label: "Keamanan Siber" },
  { value: "UI/UX & Desain", label: "UI/UX & Desain" },
  { value: "Manajemen Proyek", label: "Manajemen Proyek" },
];

const levelFilterOptions = [
  { value: "", label: "Semua Tingkat" },
  { value: "Pemula", label: "Pemula" },
  { value: "Menengah", label: "Menengah" },
  { value: "Mahir", label: "Mahir" },
];

const sortFilterOptions = [
  { value: "latest", label: "Terbaru" },
  { value: "rating", label: "Rating Tertinggi" },
  { value: "courses", label: "Modul Terbanyak" },
];

type Props = {
  initialPrograms: TrainingProgramItem[];
  initialQuery?: string;
  initialStatus?: string;
  initialTopic?: string;
  initialLevel?: string;
  initialSort?: string;
};

export function TrainingProgramsExplorer({
  initialPrograms,
  initialQuery = "",
  initialStatus = "",
  initialTopic = "",
  initialLevel = "",
  initialSort = "latest",
}: Props) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [status, setStatus] = useState<string>(initialStatus);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);

  const syncUrl = useCallback(
    (q: string, st: string, top: string, lvl: string, srt: string) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (st) params.set("status", st);
      if (top) params.set("topic", top);
      if (lvl) params.set("level", lvl);
      if (srt && srt !== "latest") params.set("sort", srt);
      const queryStr = params.toString();
      const newUrl = queryStr ? `/training-programs?${queryStr}` : "/training-programs";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      setStatus(newStatus);
      syncUrl(query, newStatus, selectedTopic, selectedLevel, selectedSort);
    },
    [query, selectedTopic, selectedLevel, selectedSort, syncUrl]
  );

  const handleTopicChange = useCallback(
    (newTopic: string) => {
      setSelectedTopic(newTopic);
      syncUrl(query, status, newTopic, selectedLevel, selectedSort);
    },
    [query, status, selectedLevel, selectedSort, syncUrl]
  );

  const handleLevelChange = useCallback(
    (newLevel: string) => {
      setSelectedLevel(newLevel);
      syncUrl(query, status, selectedTopic, newLevel, selectedSort);
    },
    [query, status, selectedTopic, selectedSort, syncUrl]
  );

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSelectedSort(newSort);
      syncUrl(query, status, selectedTopic, selectedLevel, newSort);
    },
    [query, status, selectedTopic, selectedLevel, syncUrl]
  );

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      syncUrl(newQuery, status, selectedTopic, selectedLevel, selectedSort);
    },
    [status, selectedTopic, selectedLevel, selectedSort, syncUrl]
  );

  const handleResetAll = useCallback(() => {
    setQuery("");
    setStatus("");
    setSelectedTopic("");
    setSelectedLevel("");
    setSelectedSort("latest");
    syncUrl("", "", "", "", "latest");
  }, [syncUrl]);

  // In-place filtering
  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialPrograms.filter((program) => {
      if (status) {
        const label = program.cohortStatus.label;
        if (status === "open" && !(label === "Pendaftaran Dibuka" || label === "Jadwal Aktif")) {
          return false;
        }
        if (status === "upcoming" && label !== "Segera Dibuka") {
          return false;
        }
        if (status === "closed" && !(label === "Pendaftaran Ditutup" || label === "Jadwal Belum Dibuka")) {
          return false;
        }
      }

      if (selectedTopic && program.visual.category.toLowerCase() !== selectedTopic.toLowerCase()) {
        return false;
      }

      if (selectedLevel && program.visual.level.toLowerCase() !== selectedLevel.toLowerCase()) {
        return false;
      }

      if (q) {
        const matchTitle = program.title.toLowerCase().includes(q);
        const matchSummary = (program.summary || "").toLowerCase().includes(q);
        const matchCategory = (program.visual.category || "").toLowerCase().includes(q);
        const matchAudience = (program.audience || "").toLowerCase().includes(q);
        const matchTags = (program.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchCategory && !matchAudience && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [initialPrograms, status, selectedTopic, selectedLevel, query]);

  // In-place sorting
  const sortedPrograms = useMemo(() => {
    return [...filteredPrograms].sort((a, b) => {
      if (selectedSort === "rating") {
        const aRating = a.rating?.average || 0;
        const bRating = b.rating?.average || 0;
        return bRating - aRating;
      }
      if (selectedSort === "courses") {
        return b.courseCount - a.courseCount;
      }
      return 0;
    });
  }, [filteredPrograms, selectedSort]);

  const hasActiveFilters = Boolean(
    query || status || selectedTopic || selectedLevel || (selectedSort && selectedSort !== "latest")
  );

  return (
    <>
      {/* Search & Main Filter Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cari judul, kurikulum, topik, atau sasaran peserta..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-11 pr-10 min-h-11 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
            <PortalIcon
              name="search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              className="portal-button-secondary min-h-11 shrink-0 cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Status Cohort Tabs (In-Place Interactive Buttons) */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Status Pendaftaran:</span>
          {statusFilterOptions.map((opt) => {
            const isActive = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={`inline-flex items-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-sm ring-1 ring-primary/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Topic / Category Filter Chips (In-Place Interactive Buttons) */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Bidang Keahlian:</span>
          {topicFilterOptions.map((top) => {
            const isActive = selectedTopic === top.value;
            return (
              <button
                key={top.value}
                type="button"
                onClick={() => handleTopicChange(top.value)}
                className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-xs ring-1 ring-teal-700/50"
                    : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-150 dark:hover:bg-slate-800"
                }`}
              >
                {top.label}
              </button>
            );
          })}
        </div>

        {/* Level Filter Chips & Sort Controls (In-Place Interactive Buttons) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Tingkat:</span>
            {levelFilterOptions.map((lvl) => {
              const isActive = selectedLevel === lvl.value;
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => handleLevelChange(lvl.value)}
                  className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-600 text-white shadow-xs ring-1 ring-sky-700/50"
                      : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-150 dark:hover:bg-slate-800"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Urutkan:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {sortFilterOptions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleSortChange(s.value)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedSort === s.value
                      ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Dismiss Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">Filter Aktif:</span>

            {status && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                Status: {statusFilterOptions.find((s) => s.value === status)?.label || status}
                <button
                  type="button"
                  onClick={() => handleStatusChange("")}
                  className="hover:opacity-75 font-black ml-0.5 cursor-pointer"
                  title="Hapus filter status"
                >
                  ×
                </button>
              </span>
            )}

            {selectedTopic && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Topik: {selectedTopic}
                <button
                  type="button"
                  onClick={() => handleTopicChange("")}
                  className="hover:opacity-75 font-black ml-0.5 cursor-pointer"
                  title="Hapus filter topik"
                >
                  ×
                </button>
              </span>
            )}

            {selectedLevel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Tingkat: {selectedLevel}
                <button
                  type="button"
                  onClick={() => handleLevelChange("")}
                  className="hover:opacity-75 font-black ml-0.5 cursor-pointer"
                  title="Hapus filter tingkat"
                >
                  ×
                </button>
              </span>
            )}

            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Kata Kunci: &quot;{query}&quot;
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="hover:opacity-75 font-black ml-0.5 cursor-pointer"
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

      {sortedPrograms.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "Program tidak ditemukan" : "Belum ada program terbit"}
          description={
            hasActiveFilters
              ? "Coba gunakan kata kunci atau kriteria filter lain."
              : "Program yang telah ditinjau dan diterbitkan akan tampil di sini."
          }
          actionLabel="Reset Semua Filter"
          onAction={handleResetAll}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="portal-eyebrow">Katalog Pelatihan Penuh</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {query ? `Hasil untuk “${query}”` : "Program Pelatihan Unggulan"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-bold text-slate-900 dark:text-white">{sortedPrograms.length}</span> program pelatihan terstruktur
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedPrograms.map((program) => (
              <TrainingProgramCard
                key={program.id}
                href={`/training-programs/${program.slug}`}
                title={program.title}
                summary={program.summary}
                audience={program.audience}
                courseCount={program.courseCount}
                cohortStatus={program.cohortStatus}
                image={program.visual.image}
                instructor={program.visual.instructor}
                rating={program.rating}
                category={program.visual.category}
                level={program.visual.level}
                durationLabel={program.visual.durationLabel}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
