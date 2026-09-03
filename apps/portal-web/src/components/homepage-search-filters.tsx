"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const searchFilters = [
  { label: "Semua", value: "" },
  { label: "Kelas", value: "course" },
  { label: "Pelatihan Penuh", value: "training" },
  { label: "Pembelajaran Singkat", value: "microlearning" },
  { label: "Webinar", value: "webinar" },
  { label: "Jalur Belajar", value: "learningPath" },
  { label: "Berita", value: "news" },
  { label: "Pengumuman", value: "announcement" },
];

export function HomepageSearchFilters() {
  const searchParams = useSearchParams();
  const currentContentType = searchParams.get("content_type") || "";

  return (
    <div className="max-w-5xl mx-auto mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-wrap gap-2" aria-label="Filter jenis konten" role="group">
        {searchFilters.map((filter) => {
          const isActive = filter.value === currentContentType;
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/search?content_type=${filter.value}` : "/search"}
              className={
                isActive
                  ? "px-4 py-2 rounded-full border border-primary bg-primary text-white text-sm font-semibold duration-300 shadow-sm"
                  : "px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-semibold duration-300 shadow-sm"
              }
              aria-pressed={isActive}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
      <p className="text-slate-500 dark:text-slate-300 text-sm">
        Gunakan filter untuk mempersempit hasil
      </p>
    </div>
  );
}
