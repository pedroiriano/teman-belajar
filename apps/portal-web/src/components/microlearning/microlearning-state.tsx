"use client";

import { useState } from "react";
import { PortalIcon } from "@/components/portal-icon";
import type { MicrolearningFormat, MicrolearningProgress } from "@/lib/microlearning";

export function MicrolearningState({
  itemId,
  format,
  durationMinutes,
  initialProgress,
  initialBookmarked,
}: {
  itemId: string;
  format: MicrolearningFormat;
  durationMinutes: number;
  initialProgress: MicrolearningProgress | null;
  initialBookmarked: boolean;
}) {
  const [progress, setProgress] = useState(Math.round(initialProgress?.progress_percent ?? 0));
  const [position, setPosition] = useState(initialProgress?.position_seconds ?? 0);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProgress() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/microlearning/${itemId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress_percent: progress,
          position_seconds: format === "video" ? position : 0,
        }),
      });
      if (!response.ok) throw new Error();
      const value = (await response.json()) as MicrolearningProgress;
      setProgress(Math.round(value.progress_percent));
      setPosition(value.position_seconds);
      setMessage("Posisi belajar berhasil disimpan.");
    } catch {
      setMessage("Posisi belum dapat disimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    setBusy(true);
    setMessage("");
    const next = !bookmarked;
    try {
      const response = await fetch(`/api/engagement/bookmarks/microlearning/${itemId}`, {
        method: next ? "PUT" : "DELETE",
      });
      if (!response.ok && response.status !== 204) throw new Error();
      setBookmarked(next);
      setMessage(next ? "Materi disimpan ke bookmark pembelajar." : "Dihapus dari bookmark.");
    } catch {
      setMessage("Bookmark belum dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-card p-5" aria-labelledby="microlearning-resume-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="portal-eyebrow">Aktivitas Mandiri Portal</p>
          <h2 id="microlearning-resume-title" className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
            Lanjutkan dari Posisi Anda
          </h2>
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            bookmarked
              ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700"
              : "portal-button-secondary"
          }`}
          onClick={toggleBookmark}
          disabled={busy}
          aria-pressed={bookmarked}
          title={bookmarked ? "Hapus dari bookmark" : "Simpan ke bookmark"}
        >
          <PortalIcon name="bookmark" className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
          <span>{bookmarked ? "Tersimpan" : "Bookmark"}</span>
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Progres Belajar</span>
          <span className="text-teal-600 dark:text-teal-400 font-extrabold">{progress}%</span>
        </div>
        <input
          id="microlearning-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(event) => setProgress(Number(event.target.value))}
          className="mt-2 w-full accent-teal-600 cursor-pointer"
          aria-label={`Progres belajar ${progress}%`}
        />
      </div>

      {format === "video" ? (
        <div className="mt-3">
          <label htmlFor="microlearning-position" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Posisi video (detik)
          </label>
          <input
            id="microlearning-position"
            type="number"
            min={0}
            max={durationMinutes * 60}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="portal-control mt-1 w-full text-xs"
          />
        </div>
      ) : null}

      <button
        type="button"
        className="portal-button-primary mt-4 w-full text-xs font-bold py-2.5 shadow-sm"
        onClick={saveProgress}
        disabled={busy}
      >
        {busy ? "Menyimpan…" : "Simpan Posisi"}
      </button>

      <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Progres ini mencatat riwayat baca/tonton mandiri di Portal untuk memudahkan melanjutkan materi.
      </p>

      {message && (
        <p role="status" aria-live="polite" className="mt-2 text-xs font-bold text-teal-700 dark:text-teal-400 animate-fadeIn">
          {message}
        </p>
      )}
    </section>
  );
}
