"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseRatingSummary, CourseReview } from "@/lib/training-programs";

type Props = {
  slug: string;
  initialSummary: CourseRatingSummary;
  initialReviews: CourseReview[];
  myReview: CourseReview | null;
  authenticated: boolean;
};

export function CourseReviewsSection({
  slug,
  initialSummary,
  initialReviews,
  myReview: initialMyReview,
  authenticated,
}: Props) {
  const [summary, setSummary] = useState<CourseRatingSummary>(initialSummary);
  const [reviews, setReviews] = useState<CourseReview[]>(initialReviews);
  const [myReview, setMyReview] = useState<CourseReview | null>(initialMyReview);

  // Form states
  const [rating, setRating] = useState<number>(initialMyReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>(initialMyReview?.title || "");
  const [content, setContent] = useState<string>(initialMyReview?.content || "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showForm, setShowForm] = useState<boolean>(!initialMyReview);

  const starValues = [5, 4, 3, 2, 1];

  async function fetchUpdatedData() {
    try {
      const res = await fetch(`/api/training-programs/${encodeURIComponent(slug)}/reviews`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
        if (data.reviews) setReviews(data.reviews);
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) return;
    if (rating < 1 || rating > 5) {
      setError("Silakan pilih rating antara 1 hingga 5 bintang.");
      return;
    }
    if (content.trim().length < 5) {
      setError("Ulasan minimal terdiri dari 5 karakter.");
      return;
    }
    if (content.trim().length > 2000) {
      setError("Ulasan maksimal 2000 karakter.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/training-programs/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || "Gagal mengirimkan ulasan.");
      }

      const updated = (await res.json()) as CourseReview;
      setMyReview(updated);
      setSuccess("Ulasan dan rating Anda berhasil disimpan!");
      setShowForm(false);
      await fetchUpdatedData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan ulasan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Apakah Anda yakin ingin menghapus ulasan Anda?")) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/training-programs/${encodeURIComponent(slug)}/reviews`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Gagal menghapus ulasan.");
      }
      setMyReview(null);
      setRating(5);
      setTitle("");
      setContent("");
      setShowForm(true);
      setSuccess("Ulasan Anda telah dihapus.");
      await fetchUpdatedData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus ulasan.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="portal-section border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
      <div className="portal-container max-w-5xl">
        <div className="portal-section-heading text-start">
          <p className="portal-eyebrow">Ulasan & Rating Pembelajar</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Pengalaman Belajar yang Terverifikasi
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Penilaian autentik dari pembelajar yang terdaftar dalam program pelatihan ini.
          </p>
        </div>

        {/* Rating Breakdown & Summary Card */}
        <div className="mt-8 grid gap-8 md:grid-cols-12 items-center p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          {/* Left: Big Score */}
          <div className="md:col-span-4 text-center md:border-r md:border-slate-200 dark:md:border-slate-700 md:pe-6">
            <div className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {summary.total_reviews > 0 ? summary.average_rating.toFixed(1) : "0.0"}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(summary.average_rating)
                      ? "text-amber-400 fill-current"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Berdasarkan {summary.total_reviews} ulasan pembelajar
            </p>
          </div>

          {/* Right: Star Bars */}
          <div className="md:col-span-8 space-y-2">
            {starValues.map((star) => {
              const item = summary.distribution?.[star] || { count: 0, percentage: 0 };
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="w-12 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>{star}</span>
                    <span className="text-amber-400">★</span>
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                    />
                  </div>
                  <div className="w-16 text-end text-slate-500 dark:text-slate-400 font-medium">
                    {item.count} ({Math.round(item.percentage)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User's Existing Review Banner / Actions */}
        {authenticated && myReview && !showForm ? (
          <div className="mt-8 p-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Ulasan Anda
                </span>
                <div className="flex items-center gap-1 text-amber-400 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= myReview.rating ? "text-amber-400 text-lg" : "text-slate-300 dark:text-slate-600 text-lg"}>
                      ★
                    </span>
                  ))}
                  <span className="ms-2 text-sm font-bold text-slate-900 dark:text-white">
                    {myReview.title || "Penilaian Anda"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{myReview.content}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                >
                  Edit Ulasan
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition disabled:opacity-50"
                >
                  {deleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Review Form */}
        {authenticated && showForm ? (
          <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {myReview ? "Perbarui Ulasan Pelatihan Anda" : "Berikan Ulasan & Rating Pelatihan"}
              </h3>
              {myReview ? (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Batal
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                {success}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Interactive Star Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Rating Anda
                </label>
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating bintang">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-2xl transition transform hover:scale-110 focus:outline-none"
                        aria-label={`Beri ${star} bintang`}
                      >
                        <span className={active ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}>
                          ★
                        </span>
                      </button>
                    );
                  })}
                  <span className="ms-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {hoverRating || rating} dari 5 Bintang
                  </span>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label htmlFor="review-title" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Judul Ulasan (Opsional)
                </label>
                <input
                  id="review-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Contoh: Materi sangat terstruktur dan studi kasus aplikatif"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                />
              </div>

              {/* Comment Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="review-content" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Komentar & Masukan
                  </label>
                  <span className="text-xs text-slate-400">
                    {content.length}/2000 karakter
                  </span>
                </div>
                <textarea
                  id="review-content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  minLength={5}
                  maxLength={2000}
                  placeholder="Ceritakan pengalaman Anda setelah mengikuti pelatihan ini: materi apa yang paling berkesan, bagaimana penyampaian instruktur, serta dampaknya pada keahlian Anda..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : myReview ? "Perbarui Ulasan" : "Kirim Ulasan"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Unauthenticated CTA */}
        {!authenticated ? (
          <div className="mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Apakah Anda mengikuti program pelatihan ini?
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Masuk dengan akun Anda untuk memberikan ulasan dan membagikan pengalaman belajar kepada pembelajar lainnya.
            </p>
            <div className="mt-4">
              <Link
                href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/training-programs/${slug}`)}`}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-700 text-white text-xs font-bold transition shadow-sm"
              >
                Masuk untuk Memberikan Ulasan
              </Link>
            </div>
          </div>
        ) : null}

        {/* Reviews List */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Semua Ulasan ({reviews.length})
            </h3>
          </div>

          {reviews.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-3xl">💬</span>
              <h4 className="mt-3 font-bold text-slate-900 dark:text-white text-sm">
                Belum Ada Ulasan
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Jadilah pembelajar pertama yang memberikan ulasan dan rating untuk program pelatihan ini!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reviews.map((rev) => {
                const initials = rev.author_name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const formattedDate = new Date(rev.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <div key={rev.id} className="py-6 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      {/* Author Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {initials || "PB"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {rev.author_name}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              Terverifikasi
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 text-amber-400 text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= rev.rating ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Review Body */}
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      {rev.title ? (
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                          {rev.title}
                        </h5>
                      ) : null}
                      <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                        &ldquo;{rev.content}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
