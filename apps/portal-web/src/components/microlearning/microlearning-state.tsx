"use client";

import { useState } from "react";

import type { MicrolearningFormat, MicrolearningProgress } from "@/lib/microlearning";

export function MicrolearningState({ itemId, format, durationMinutes, initialProgress, initialBookmarked }: { itemId: string; format: MicrolearningFormat; durationMinutes: number; initialProgress: MicrolearningProgress | null; initialBookmarked: boolean }) {
  const [progress, setProgress] = useState(Math.round(initialProgress?.progress_percent ?? 0));
  const [position, setPosition] = useState(initialProgress?.position_seconds ?? 0);
  const [bookmarked, setBookmarked] = useState(initialBookmarked); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function saveProgress() { setBusy(true); setMessage(""); try { const response = await fetch(`/api/microlearning/${itemId}/progress`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress_percent: progress, position_seconds: format === "video" ? position : 0 }) }); if (!response.ok) throw new Error(); const value = await response.json() as MicrolearningProgress; setProgress(Math.round(value.progress_percent)); setPosition(value.position_seconds); setMessage("Posisi belajar tersimpan."); } catch { setMessage("Posisi belum dapat disimpan. Coba lagi."); } finally { setBusy(false); } }
  async function toggleBookmark() { setBusy(true); setMessage(""); const next = !bookmarked; try { const response = await fetch(`/api/engagement/bookmarks/microlearning/${itemId}`, { method: next ? "PUT" : "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(); setBookmarked(next); setMessage(next ? "Disimpan ke bookmark." : "Dihapus dari bookmark."); } catch { setMessage("Bookmark belum dapat diperbarui."); } finally { setBusy(false); } }
  return <section className="portal-card p-5" aria-labelledby="microlearning-resume-title">
    <div className="flex items-start justify-between gap-3"><div><p className="portal-eyebrow">Aktivitas editorial Portal</p><h2 id="microlearning-resume-title" className="mt-2 text-lg font-black text-slate-900">Lanjutkan dari posisi Anda</h2></div><button type="button" className="portal-button-secondary" onClick={toggleBookmark} disabled={busy} aria-pressed={bookmarked}>{bookmarked ? "Tersimpan" : "Bookmark"}</button></div>
    <label htmlFor="microlearning-progress" className="mt-5 block text-sm font-bold text-slate-700">Progres baca/tonton: {progress}%</label>
    <input id="microlearning-progress" type="range" min={0} max={100} step={5} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="mt-2 w-full accent-teal-700" />
    {format === "video" ? <div className="mt-4"><label htmlFor="microlearning-position" className="text-sm font-bold text-slate-700">Posisi video (detik)</label><input id="microlearning-position" type="number" min={0} max={durationMinutes * 60} value={position} onChange={(event) => setPosition(Number(event.target.value))} className="portal-control mt-2 w-full" /></div> : null}
    <button type="button" className="portal-button-primary mt-5 w-full" onClick={saveProgress} disabled={busy}>{busy ? "Menyimpan…" : "Simpan posisi"}</button>
    <p className="mt-3 text-xs leading-5 text-slate-500">Progres ini hanya membantu melanjutkan materi Portal. Ini bukan completion, nilai, atau sertifikat Moodle.</p>
    <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs font-bold text-teal-800">{message}</p>
  </section>;
}
