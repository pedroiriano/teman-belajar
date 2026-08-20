"use client";

/* eslint-disable @next/next/no-img-element -- Media Library serves authenticated, runtime MIME-specific previews through the BFF. */

import { useEffect, useRef, useState } from "react";

import { AdminIcon } from "@/components/admin-icon";

type MediaAsset = { id: string; detected_mime_type: string; original_filename: string; status: string };

export default function MediaPicker({ onSelect, buttonLabel = "Pilih media" }: { onSelect: (mediaId: string) => void; buttonLabel?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const controller = new AbortController();
    const loadMedia = async () => {
      setLoading(true); setError("");
      try { const response = await fetch("/api/bff/media?page_size=50", { signal: controller.signal }); if (!response.ok) throw new Error("Media Library belum dapat dimuat"); const payload = await response.json(); setMedia(Array.isArray(payload.data) ? payload.data : []); }
      catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Media Library belum dapat dimuat"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    const frame = window.requestAnimationFrame(() => { void loadMedia(); closeRef.current?.focus(); });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", onKeyDown);
    return () => { controller.abort(); window.cancelAnimationFrame(frame); window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; trigger?.focus(); };
  }, [isOpen]);

  return <>
    <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)} className="admin-button-secondary"><AdminIcon name="media" className="mr-2 h-4 w-4" />{buttonLabel}</button>
    {isOpen && <div className="admin-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
        <header className="flex items-center justify-between border-b p-5 sm:px-6"><div><p className="admin-kicker">Media Library</p><h2 id="media-picker-title" className="mt-1 text-xl font-black text-slate-900">Pilih media</h2></div><button ref={closeRef} type="button" onClick={() => setIsOpen(false)} className="admin-icon-button grid" aria-label="Tutup pemilih media"><AdminIcon name="close" className="h-5 w-5" /></button></header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Memuat media">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-slate-100" />)}</div> : error ? <div className="admin-alert-error" role="alert">{error}</div> : media.length === 0 ? <div className="admin-empty"><span className="admin-stat-icon mx-auto"><AdminIcon name="media" className="h-5 w-5" /></span><h3 className="mt-4 font-black text-slate-900">Belum ada media</h3><p className="mt-2 text-sm">Unggah aset melalui Media Library terlebih dahulu.</p></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{media.map((asset) => <button key={asset.id} type="button" className="group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-lg" onClick={() => { onSelect(asset.id); setIsOpen(false); }}><span className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">{asset.detected_mime_type.startsWith("image/") ? <img src={`/api/bff/media/${asset.id}/content`} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <span className="text-xs font-black text-slate-400">{asset.detected_mime_type.split("/")[1]?.toUpperCase()}</span>}</span><span className="block truncate p-3 text-xs font-bold text-slate-700" title={asset.original_filename}>{asset.original_filename}</span></button>)}</div>}
        </div>
        <footer className="flex justify-end border-t bg-slate-50 px-5 py-4"><button type="button" className="admin-button-secondary" onClick={() => setIsOpen(false)}>Batal</button></footer>
      </section>
    </div>}
  </>;
}

