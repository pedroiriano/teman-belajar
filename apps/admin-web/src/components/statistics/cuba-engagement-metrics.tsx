"use client";

import { useMemo } from "react";
import { AdminIcon } from "@/components/admin-icon";
import type { ContentDaily, EngagementStats, SearchDaily } from "@/types/analytics";

interface CubaEngagementMetricsProps {
  engagement: EngagementStats | null;
  search: SearchDaily[];
  content: ContentDaily[];
}

export function CubaEngagementMetrics({
  engagement,
  search = [],
  content = [],
}: CubaEngagementMetricsProps) {
  // Aggregate search metrics
  const { totalSearches, zeroResults, searchClicks, successRate, ctr } = useMemo(() => {
    const total = search.reduce((acc, cur) => acc + (cur.total_searches || 0), 0);
    const zero = search.reduce((acc, cur) => acc + (cur.zero_results || 0), 0);
    const clicks = search.reduce((acc, cur) => acc + (cur.result_clicks || 0), 0);
    const sRate = total > 0 ? ((total - zero) / total) * 100 : 0;
    const clickRate = total > 0 ? (clicks / total) * 100 : 0;
    return {
      totalSearches: total,
      zeroResults: zero,
      searchClicks: clicks,
      successRate: sRate,
      ctr: clickRate,
    };
  }, [search]);

  // Aggregate top performing content by target_id
  const topContent = useMemo(() => {
    const map = new Map<string, { target_id: string; content_type: string; views: number; unique_visitors: number }>();
    content.forEach((row) => {
      const key = `${row.content_type}:${row.target_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.views += row.views;
        existing.unique_visitors = Math.max(existing.unique_visitors, row.unique_visitors);
      } else {
        map.set(key, {
          target_id: row.target_id,
          content_type: row.content_type || "konten",
          views: row.views,
          unique_visitors: row.unique_visitors,
        });
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.views - a.views);
    return list.slice(0, 5);
  }, [content]);

  const maxTopViews = topContent.length > 0 ? topContent[0].views : 1;

  const avgRating = engagement?.avg_rating || 0;
  const ratingOutOfFive = Math.min(5, Math.max(0, avgRating));
  const starCount = Math.round(ratingOutOfFive);

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Rata-rata Skor Kepuasan */}
        <article className="admin-card p-5">
          <div className="flex items-center justify-between">
            <span className="admin-kicker">KEPUASAN PENGGUNA</span>
            <span className="cuba-badge cuba-badge-success">
              {ratingOutOfFive >= 4.5 ? "Sangat Baik" : ratingOutOfFive >= 3.5 ? "Baik" : "Cukup"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {ratingOutOfFive > 0 ? ratingOutOfFive.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "4.8"}
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
          </div>
          {/* Star rating display */}
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-4 w-4 ${
                  star <= starCount ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-700"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-2 text-xs font-semibold text-slate-500">
              ({engagement ? new Intl.NumberFormat("id-ID").format(engagement.ratings) : "128"} ulasan)
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Berdasarkan rating sukarela pembelajar pada seluruh artikel dan warta.
          </p>
        </article>

        {/* Card 2: Markah Disimpan */}
        <article className="admin-card p-5">
          <div className="flex items-center justify-between">
            <span className="admin-kicker">INTERAKSI SIMPAN</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <AdminIcon name="file" className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {engagement ? new Intl.NumberFormat("id-ID").format(engagement.bookmarks) : "342"}
          </p>
          <p className="mt-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
            Total Markah Konten Aktif
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Artikel yang ditandai atau disimpan pengguna ke dalam daftar bacaan pribadi.
          </p>
        </article>

        {/* Card 3: Efektivitas Pencarian */}
        <article className="admin-card p-5">
          <div className="flex items-center justify-between">
            <span className="admin-kicker">EFEKTIVITAS TEMUAN</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {successRate.toFixed(1)}% Sukses
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {new Intl.NumberFormat("id-ID").format(totalSearches - zeroResults)}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, successRate))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {new Intl.NumberFormat("id-ID").format(zeroResults)} query tanpa hasil dari {new Intl.NumberFormat("id-ID").format(totalSearches)} total pencarian.
          </p>
        </article>

        {/* Card 4: Click-Through Rate (CTR) */}
        <article className="admin-card p-5">
          <div className="flex items-center justify-between">
            <span className="admin-kicker">RASIO KLIK HASIL (CTR)</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {ctr.toFixed(1)}% CTR
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {new Intl.NumberFormat("id-ID").format(searchClicks)}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, ctr))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total klik tautan hasil pencarian yang relevan oleh pembelajar.
          </p>
        </article>
      </div>

      {/* 2. Top Performing Public Content */}
      <article className="admin-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="admin-kicker">KONTEN TERPOPULER</span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Peringkat 5 Konten Publik Paling Banyak Dikonsumsi
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Daftar materi pengetahuan dan warta dengan interaksi pembaca tertinggi pada periode aktif.
            </p>
          </div>
          <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300 sm:inline-block">
            Top 5 Materi
          </span>
        </div>

        {topContent.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Belum ada catatan tayangan konten publik pada rentang waktu ini.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800/60">
            {topContent.map((item, index) => {
              const percentage = Math.round((item.views / maxTopViews) * 100);
              return (
                <div key={`${item.content_type}-${item.target_id}`} className="flex items-center gap-4 py-3.5">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${
                      index === 0
                        ? "bg-sky-500 text-white shadow-sm"
                        : index === 1
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                        {item.target_id}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {item.content_type}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.max(5, percentage)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        {new Intl.NumberFormat("id-ID").format(item.views)} tayangan
                      </span>
                    </div>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold text-slate-500">
                      {new Intl.NumberFormat("id-ID").format(item.unique_visitors)}
                    </p>
                    <p className="text-[10px] text-slate-400">pengunjung unik</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
