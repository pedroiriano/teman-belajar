"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PortalIcon } from "@/components/portal-icon";
import type { EngagementList, RatingSummary } from "@/lib/engagement/types";

type Props = {
  targetId: string;
  authenticated: boolean;
  initialSummary: RatingSummary;
};

function writeFailureMessage(kind: "bookmark" | "rating", status: number) {
  if (status === 401) return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  if (status === 403) return "Permintaan ditolak oleh perlindungan keamanan. Muat ulang halaman lalu coba lagi.";
  if (status === 422) return kind === "rating" ? "Nilai harus berupa angka 1 sampai 5." : "Artikel ini tidak dapat disimpan.";
  if (status === 503) return "Layanan engagement sedang tidak tersedia. Silakan coba lagi.";
  return kind === "rating" ? "Penilaian belum tersimpan. Silakan coba lagi." : "Perubahan belum tersimpan. Silakan coba lagi.";
}

export function KnowledgeEngagement({ targetId, authenticated, initialSummary }: Props) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [rating, setRating] = useState<number | undefined>();
  const [summary, setSummary] = useState(initialSummary);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const viewRecorded = useRef(false);
  const targetPath = `knowledge/${targetId}`;

  function signIn() {
    const callbackUrl = window.location.pathname.startsWith("/") ? window.location.pathname : "/knowledge";
    router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    Promise.allSettled([
      fetch("/api/engagement/bookmarks", { cache: "no-store", signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("bookmarks");
        const payload = await response.json() as EngagementList;
        setBookmarked(payload.data.some((item) => item.target_type === "knowledge" && item.target_id === targetId));
      }),
      fetch(`/api/engagement/ratings/${targetPath}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error("rating");
        const payload = await response.json() as RatingSummary;
        setSummary(payload);
        setRating(payload.current_user_rating);
      }),
    ]);
    if (!viewRecorded.current) {
      viewRecorded.current = true;
      fetch(`/api/engagement/recent-views/${targetPath}`, { method: "PUT", signal: controller.signal }).catch(() => undefined);
    }
    return () => controller.abort();
  }, [authenticated, targetId, targetPath]);

  async function toggleBookmark() {
    if (!authenticated) { signIn(); return; }
    const previous = bookmarked;
    const next = !previous;
    setBookmarked(next);
    setBookmarkPending(true);
    setFeedback(next ? "Menyimpan artikel…" : "Menghapus dari tersimpan…");
    try {
      const response = await fetch(`/api/engagement/bookmarks/${targetPath}`, { method: next ? "PUT" : "DELETE" });
      if (!response.ok) throw new Error(writeFailureMessage("bookmark", response.status));
      setFeedback(next ? "Artikel tersimpan." : "Artikel dihapus dari daftar tersimpan.");
    } catch (error) {
      setBookmarked(previous);
      setFeedback(error instanceof Error ? error.message : writeFailureMessage("bookmark", 0));
    } finally { setBookmarkPending(false); }
  }

  async function updateRating(value: number) {
    if (!authenticated) { signIn(); return; }
    const previous = rating;
    setRating(value);
    setRatingPending(true);
    setFeedback(`Menyimpan penilaian ${value} dari 5…`);
    try {
      const response = await fetch(`/api/engagement/ratings/${targetPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (!response.ok) throw new Error(writeFailureMessage("rating", response.status));
      const payload = await response.json() as RatingSummary;
      setSummary(payload);
      setRating(payload.current_user_rating ?? value);
      setFeedback(`Penilaian ${value} dari 5 tersimpan.`);
    } catch (error) {
      setRating(previous);
      setFeedback(error instanceof Error ? error.message : writeFailureMessage("rating", 0));
    } finally { setRatingPending(false); }
  }

  return (
    <section className="portal-card mb-8 grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6" aria-labelledby="knowledge-engagement-title">
      <div>
        <p className="portal-eyebrow">Simpan untuk nanti</p>
        <h2 id="knowledge-engagement-title" className="mt-2 text-lg font-black text-slate-900">Kelola artikel ini</h2>
        <button type="button" className={`mt-4 ${bookmarked ? "portal-button-primary" : "portal-button-secondary"}`} aria-pressed={bookmarked} aria-label={bookmarked ? "Hapus artikel dari tersimpan" : "Simpan artikel"} disabled={bookmarkPending} onClick={toggleBookmark}>
          <PortalIcon name="bookmark" className={`mr-2 h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
          {bookmarkPending ? "Memproses…" : bookmarked ? "Tersimpan" : "Simpan"}
        </button>
      </div>
      <fieldset disabled={ratingPending} className="min-w-0 sm:border-l sm:border-slate-200 sm:pl-6">
        <legend className="text-sm font-black text-slate-900">Nilai kegunaan artikel</legend>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Penilaian artikel">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={`grid h-11 w-11 cursor-pointer place-items-center rounded-xl border transition ${rating === value ? "border-amber-500 bg-amber-50 text-amber-600" : "border-slate-200 bg-white text-slate-400 hover:border-amber-400 hover:text-amber-500"}`}>
              <input type="radio" name={`rating-${targetId}`} value={value} checked={rating === value} onChange={() => updateRating(value)} onClick={() => { if (!authenticated) signIn(); }} className="sr-only" aria-label={`${value} dari 5`} />
              <PortalIcon name="star" className={`h-5 w-5 ${rating !== undefined && value <= rating ? "fill-current" : ""}`} />
            </label>
          ))}
          <span className="ml-1 text-sm font-semibold text-slate-600">{summary.count > 0 ? `${summary.average.toFixed(1)} dari 5 · ${summary.count} penilaian` : "Belum ada penilaian"}</span>
        </div>
        {!authenticated && <p className="mt-3 text-xs text-slate-500">Masuk untuk menyimpan artikel dan memberi penilaian.</p>}
      </fieldset>
      <p className="sr-only" aria-live="polite">{feedback}</p>
    </section>
  );
}
