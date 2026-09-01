"use client";

/* eslint-disable @next/next/no-img-element -- authenticated BFF media previews have runtime MIME types */

import { useEffect, useId, useRef, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import MediaUploadPanel from "./MediaUploadPanel";
import type { MediaAsset, MediaPolicy, MediaSelection } from "./types";

type Props = { onSelect: (media: MediaSelection) => void; buttonLabel?: string; imageOnly?: boolean; videoOnly?: boolean };

export default function MediaPicker({ onSelect, buttonLabel = "Pilih media", imageOnly = false, videoOnly = false }: Props) {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [policy, setPolicy] = useState<MediaPolicy | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [altText, setAltText] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [query, setQuery] = useState("");
  const restrictedKind = imageOnly ? "image" : videoOnly ? "video" : "";
  const [kind, setKind] = useState("all");
  const effectiveKind = restrictedKind || kind;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); return; }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; trigger?.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    void fetch("/api/bff/media/policy", { signal: controller.signal }).then(async (response) => {
      const payload = await response.json(); if (!response.ok) throw new Error(payload.detail || payload.title); setPolicy(payload.data);
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Kebijakan media belum dapat dimuat"); });
    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || tab !== "library") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ page: String(page), page_size: "12", q: query, kind: effectiveKind });
      void fetch(`/api/bff/media?${params}`, { signal: controller.signal }).then(async (response) => {
        const payload = await response.json(); if (!response.ok) throw new Error(payload.detail || payload.title || "Pustaka Media belum dapat dimuat");
        setMedia(Array.isArray(payload.data) ? payload.data : []); setTotal(Number(payload.meta?.total ?? 0));
      }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Pustaka Media belum dapat dimuat"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [isOpen, tab, page, query, effectiveKind]);

  const choose = (asset: MediaAsset) => { if ((imageOnly && !asset.detected_mime_type.startsWith("image/")) || (videoOnly && !asset.detected_mime_type.startsWith("video/"))) return; setSelected(asset); setAltText(asset.alt_text ?? ""); setDecorative(false); };
  const confirm = () => {
    if (!selected) return;
    if (selected.detected_mime_type.startsWith("image/") && !decorative && !altText.trim()) { setError("Isi teks alternatif atau tandai gambar sebagai dekoratif."); return; }
    onSelect({ ...selected, insertion_alt_text: decorative ? "" : altText.trim(), decorative }); setIsOpen(false);
  };
  const uploadComplete = (selection: MediaSelection) => { if ((imageOnly && !selection.detected_mime_type.startsWith("image/")) || (videoOnly && !selection.detected_mime_type.startsWith("video/"))) { setError(videoOnly ? "Pilih aset video MP4 atau WEBM." : "Pilih aset gambar."); setTab("library"); return; } onSelect(selection); setIsOpen(false); };
  const pages = Math.max(1, Math.ceil(total / 12));

  return <>
    <button ref={triggerRef} type="button" onClick={() => { setIsOpen(true); setSelected(null); setPage(1); setError(""); }} className="admin-button-secondary"><AdminIcon name="media" className="mr-2 h-4 w-4" />{buttonLabel}</button>
    {isOpen && <div className="admin-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section ref={modalRef} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="flex items-center justify-between border-b p-5 sm:px-6"><div><p className="admin-kicker">Integrated Media Manager</p><h2 id={titleId} className="mt-1 text-xl font-black text-slate-900">Sisipkan media</h2></div><button ref={closeRef} type="button" onClick={() => setIsOpen(false)} className="admin-icon-button grid" aria-label="Tutup pengelola media"><AdminIcon name="close" className="h-5 w-5" /></button></header>
        <div className="border-b px-5 pt-3 sm:px-6" role="tablist" aria-label="Sumber media"><button type="button" role="tab" aria-selected={tab === "library"} className={`admin-accent-control border-b-2 px-4 py-3 text-sm font-black ${tab === "library" ? "" : "!border-transparent !text-slate-500"}`} onClick={() => setTab("library")}>Pustaka Media</button><button type="button" role="tab" aria-selected={tab === "upload"} className={`admin-accent-control border-b-2 px-4 py-3 text-sm font-black ${tab === "upload" ? "" : "!border-transparent !text-slate-500"}`} onClick={() => setTab("upload")}>Unggah Baru</button></div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && <div className="admin-alert-error mb-4" role="alert">{error}</div>}
          {tab === "upload" ? <MediaUploadPanel compact policy={policy} requireInsertionAlt onUploaded={uploadComplete} /> : <>
            <div className={`mb-5 grid gap-3 ${restrictedKind ? "" : "sm:grid-cols-[1fr_180px]"}`}><div><label htmlFor={`${titleId}-search`} className="sr-only">Cari media</label><input id={`${titleId}-search`} className="admin-input" placeholder="Cari nama atau judul media…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>{!restrictedKind && <div><label htmlFor={`${titleId}-kind`} className="sr-only">Jenis media</label><select id={`${titleId}-kind`} className="admin-input" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="all">Semua jenis</option><option value="image">Gambar</option><option value="video">Video</option><option value="document">Dokumen PDF</option></select></div>}</div>
            {loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Memuat media">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-slate-100" />)}</div> : media.length === 0 ? <div className="admin-empty"><h3 className="font-black text-slate-900">Media tidak ditemukan</h3><p className="mt-2 text-sm">Ubah pencarian atau unggah aset baru.</p></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{media.map((asset) => <button key={asset.id} type="button" disabled={asset.status !== "active"} aria-pressed={selected?.id === asset.id} className="admin-accent-control group overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2" onClick={() => choose(asset)}><span className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">{asset.detected_mime_type.startsWith("image/") ? <img src={`/api/bff/media/${asset.id}/content`} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <span className="text-xs font-black text-slate-500">{asset.detected_mime_type.startsWith("video/") ? "VIDEO" : "PDF"}</span>}</span><span className="block truncate p-3 text-xs font-bold text-slate-700" title={asset.display_filename ?? asset.original_filename ?? "Media"}>{asset.display_filename ?? asset.original_filename ?? "Media"}</span></button>)}</div>}
            <div className="mt-5 flex items-center justify-between"><p className="text-xs text-slate-500">{total} aset · halaman {page} dari {pages}</p><div className="flex gap-2"><button type="button" className="admin-button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><button type="button" className="admin-button-secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div></div>
            {selected?.detected_mime_type.startsWith("image/") && <div className="mt-5 rounded-xl border p-4"><label className="admin-label" htmlFor={`${titleId}-alt`}>Teks alternatif untuk penyisipan</label><input id={`${titleId}-alt`} className="admin-input" value={altText} disabled={decorative} onChange={(event) => setAltText(event.target.value)} maxLength={255} /><label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={decorative} onChange={(event) => setDecorative(event.target.checked)} /> Dekoratif</label></div>}
          </>}
        </div>
        <footer className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4"><button type="button" className="admin-button-secondary" onClick={() => setIsOpen(false)}>Batal</button>{tab === "library" && <button type="button" className="admin-button" disabled={!selected} onClick={confirm}>Sisipkan media</button>}</footer>
      </section>
    </div>}
  </>;
}
