"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminIcon } from "@/components/admin-icon";
import {
  getCourseReviewsAction,
  moderateReviewStatusAction,
  type CourseReview,
} from "@/app/actions/course-reviews";
import { getTrainingWorkspaceAction, type TrainingProgram } from "@/app/actions/training-programs";

const statusBadges: Record<string, { label: string; className: string }> = {
  published: { label: "Terbit", className: "cuba-badge-success" },
  flagged: { label: "Ditandai", className: "cuba-badge-warning" },
  hidden: { label: "Disembunyikan", className: "cuba-badge-neutral" },
};

export default function CourseReviewsAdminPage() {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filter states
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [reviewsRes, workspaceRes] = await Promise.all([
      getCourseReviewsAction({
        program_slug: programFilter === "all" ? undefined : programFilter,
        status: statusFilter,
        rating: ratingFilter === "all" ? undefined : ratingFilter,
        q: searchQuery,
      }),
      getTrainingWorkspaceAction(),
    ]);

    if (!reviewsRes.success) {
      setError(reviewsRes.error || "Gagal memuat ulasan pelatihan.");
    } else {
      setReviews(reviewsRes.reviews);
    }

    if (workspaceRes.success) {
      setPrograms(workspaceRes.programs);
    }
    setLoading(false);
  }, [programFilter, statusFilter, ratingFilter, searchQuery]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getCourseReviewsAction({
        program_slug: programFilter === "all" ? undefined : programFilter,
        status: statusFilter,
        rating: ratingFilter === "all" ? undefined : ratingFilter,
        q: searchQuery,
      }),
      getTrainingWorkspaceAction(),
    ]).then(([reviewsRes, workspaceRes]) => {
      if (!active) return;
      setLoading(false);
      if (!reviewsRes.success) {
        setError(reviewsRes.error || "Gagal memuat ulasan pelatihan.");
      } else {
        setReviews(reviewsRes.reviews);
      }
      if (workspaceRes.success) {
        setPrograms(workspaceRes.programs);
      }
    });

    return () => {
      active = false;
    };
  }, [programFilter, statusFilter, ratingFilter, searchQuery]);

  async function handleModerate(id: string, status: "published" | "hidden" | "flagged") {
    setBusyId(id);
    setError("");
    setNotice("");
    const res = await moderateReviewStatusAction(id, status);
    if (!res.success) {
      setError(res.error || "Gagal memoderasi ulasan.");
    } else {
      const label = statusBadges[status]?.label || status;
      setNotice(`Status ulasan berhasil diubah menjadi: ${label}.`);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r))
      );
    }
    setBusyId(null);
  }

  // Summary metrics
  const stats = useMemo(() => {
    const total = reviews.length;
    const published = reviews.filter((r) => r.status === "published").length;
    const flagged = reviews.filter((r) => r.status === "flagged").length;
    const hidden = reviews.filter((r) => r.status === "hidden").length;
    const avg =
      total > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)
        : "0.0";
    return { total, published, flagged, hidden, avg };
  }, [reviews]);

  return (
    <div className="admin-page space-y-6" data-cuba-page="course-reviews">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Ruang Kerja Editorial</p>
          <h1 className="admin-page-title">Moderasi Ulasan Pelatihan</h1>
          <p className="admin-page-copy">
            Kelola ulasan dan rating pembelajar untuk seluruh program pelatihan. Jaga mutu feedback, transparansi komunitas, dan moderasi konten sensitif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/training-programs"
            className="admin-button-secondary text-xs"
          >
            Katalog Program
          </Link>
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="admin-button text-xs"
          >
            {loading ? "Menyegarkan..." : "Segarkan Data"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notice ? (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-600 hover:text-rose-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Cuba Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ulasan</p>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
          <p className="text-[11px] text-slate-400">Seluruh ulasan terdata</p>
        </div>
        <div className="admin-card p-4 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rating Rata-rata</p>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <span>★</span>
            <span>{stats.avg}</span>
          </div>
          <p className="text-[11px] text-slate-400">Skor keseluruhan</p>
        </div>
        <div className="admin-card p-4 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perlu Peninjauan</p>
          <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{stats.flagged}</div>
          <p className="text-[11px] text-slate-400">Ulasan ditandai</p>
        </div>
        <div className="admin-card p-4 space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Terbit</p>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.published}</div>
          <p className="text-[11px] text-slate-400">{stats.hidden} disembunyikan</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Program Select */}
          <div>
            <label htmlFor="filter-program" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Program Pelatihan
            </label>
            <select
              id="filter-program"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Semua Program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="filter-status" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status Moderasi
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Semua Status</option>
              <option value="published">Terbit (Aktif)</option>
              <option value="flagged">Ditandai (Perlu Ditinjau)</option>
              <option value="hidden">Disembunyikan</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label htmlFor="filter-rating" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Rating Bintang
            </label>
            <select
              id="filter-rating"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">Semua Rating (1-5)</option>
              <option value="5">5 Bintang (★★★★★)</option>
              <option value="4">4 Bintang (★★★★☆)</option>
              <option value="3">3 Bintang (★★★☆☆)</option>
              <option value="2">2 Bintang (★★☆☆☆)</option>
              <option value="1">1 Bintang (★☆☆☆☆)</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label htmlFor="filter-search" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Pencarian Teks
            </label>
            <input
              id="filter-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pembelajar / isi..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Reviews Moderation Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Daftar Ulasan & Rating ({reviews.length})
          </h2>
          <span className="text-xs text-slate-400">
            {loading ? "Memuat..." : "Terkini"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <AdminIcon name="file" className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Tidak ada ulasan yang sesuai filter
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Sesuaikan filter di atas atau muat ulang data untuk melihat ulasan lainnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4 text-start">Pembelajar</th>
                  <th className="py-3 px-4 text-start">Program Pelatihan</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                  <th className="py-3 px-4 text-start">Ulasan</th>
                  <th className="py-3 px-4 text-start">Tanggal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-end">Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviews.map((item) => {
                  const badge = statusBadges[item.status] || {
                    label: item.status,
                    className: "cuba-badge-neutral",
                  };
                  const isBusy = busyId === item.id;
                  const formattedDate = new Date(item.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.author_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                        <Link
                          href={`/training-programs/${item.program_slug}`}
                          target="_blank"
                          className="hover:underline hover:text-sky-600"
                        >
                          {item.program_slug}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-black text-yellow-500">
                          {item.rating} ★
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {item.title ? (
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.title}
                          </div>
                        ) : null}
                        <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                          {item.content}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.status !== "published" ? (
                            <button
                              type="button"
                              onClick={() => handleModerate(item.id, "published")}
                              disabled={isBusy}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition disabled:opacity-50"
                            >
                              Terbitkan
                            </button>
                          ) : null}
                          {item.status !== "flagged" ? (
                            <button
                              type="button"
                              onClick={() => handleModerate(item.id, "flagged")}
                              disabled={isBusy}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 transition disabled:opacity-50"
                            >
                              Tandai
                            </button>
                          ) : null}
                          {item.status !== "hidden" ? (
                            <button
                              type="button"
                              onClick={() => handleModerate(item.id, "hidden")}
                              disabled={isBusy}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition disabled:opacity-50"
                            >
                              Sembunyikan
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
