"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalIcon } from "@/components/portal-icon";
import type { RatingSummary } from "@/lib/engagement/types";

type Props = {
  itemId: string;
  authenticated: boolean;
  initialSummary?: RatingSummary;
};

export function MicrolearningRating({ itemId, authenticated, initialSummary }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number | undefined>(initialSummary?.current_user_rating);
  const [summary, setSummary] = useState<RatingSummary>(initialSummary || { average: 0, count: 0 });
  const [ratingPending, setRatingPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const targetPath = `microlearning/${itemId}`;

  function signIn() {
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname : "/microlearning";
    router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    fetch(`/api/engagement/ratings/${targetPath}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as RatingSummary;
        setSummary(payload);
        if (typeof payload.current_user_rating === "number") {
          setRating(payload.current_user_rating);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [authenticated, targetPath]);

  async function updateRating(value: number) {
    if (!authenticated) {
      signIn();
      return;
    }
    const previous = rating;
    setRating(value);
    setRatingPending(true);
    setFeedback(`Menyimpan penilaian ${value} dari 5…`);

    try {
      const res = await fetch(`/api/engagement/ratings/${targetPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan rating");
      const payload = (await res.json()) as RatingSummary;
      setSummary(payload);
      setRating(payload.current_user_rating ?? value);
      setFeedback(`Terima kasih! Penilaian ${value} dari 5 bintang tersimpan.`);
    } catch {
      setRating(previous);
      setFeedback("Penilaian belum tersimpan. Silakan coba lagi.");
    } finally {
      setRatingPending(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Ulasan & Rating Pembelajar
        </h3>
        {summary.count > 0 && (
          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
            ★ {summary.average.toFixed(1)} / 5.0
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Apakah materi ini membantu mempercepat pemahaman Anda? Berikan rating bintang:
      </p>

      <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Penilaian materi microlearning">
        {[1, 2, 3, 4, 5].map((val) => {
          const isSelected = rating !== undefined && val <= rating;
          return (
            <button
              key={val}
              type="button"
              disabled={ratingPending}
              onClick={() => updateRating(val)}
              className={`p-1.5 rounded-lg transition-all ${
                isSelected
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
              }`}
              title={`${val} dari 5 bintang`}
              aria-label={`${val} dari 5 bintang`}
            >
              <PortalIcon name="star" className={`h-5 w-5 ${isSelected ? "fill-current" : ""}`} />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {summary.count > 0 ? `(${summary.count} ulasan)` : "(Belum ada ulasan)"}
        </span>
      </div>

      {feedback && (
        <p className="mt-2 text-xs font-semibold text-teal-700 dark:text-teal-400 animate-fadeIn" role="status">
          {feedback}
        </p>
      )}

      {!authenticated && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Masuk dengan akun pembelajar Anda untuk menyimpan rating.
        </p>
      )}
    </div>
  );
}
