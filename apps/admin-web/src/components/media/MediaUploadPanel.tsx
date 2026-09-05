"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { compressImage } from "./compression";
import { formatBytes, needsCompression, validateClientFile } from "./client-policy";
import type { MediaAsset, MediaPolicy, MediaSelection } from "./types";

type Props = {
  policy?: MediaPolicy | null;
  compact?: boolean;
  requireInsertionAlt?: boolean;
  onUploaded?: (asset: MediaSelection) => void;
};

export default function MediaUploadPanel({ policy: suppliedPolicy, compact = false, requireInsertionAlt = false, onUploaded }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadedPolicy, setLoadedPolicy] = useState<MediaPolicy | null>(null);
  const policy = suppliedPolicy ?? loadedPolicy;
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [state, setState] = useState<"idle" | "compressing" | "uploading">("idle");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (suppliedPolicy) return;
    const controller = new AbortController();
    void fetch("/api/bff/media/policy", { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.title || "Kebijakan media belum dapat dimuat");
      setLoadedPolicy(payload.data);
    }).catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Kebijakan media belum dapat dimuat"); });
    return () => controller.abort();
  }, [suppliedPolicy]);

  const chooseFile = (next: File | null) => {
    setError(""); setConsentOpen(false);
    if (!next || !policy) { setFile(next); return; }
    const issue = validateClientFile(next, policy);
    if (issue) { setFile(null); setError(issue); if (inputRef.current) inputRef.current.value = ""; return; }
    setFile(next); setTitle(next.name.replace(/\.[^.]+$/, "")); setAltText(""); setDecorative(false);
  };

  const upload = async (compress: boolean) => {
    if (!file || !policy) return;
    if (requireInsertionAlt && file.type.startsWith("image/") && !decorative && !altText.trim()) { setError("Isi teks alternatif atau tandai gambar sebagai dekoratif."); return; }
    let uploadFile = file;
    try {
      setError("");
      if (needsCompression(file, policy)) {
        if (!compress) { setConsentOpen(true); return; }
        setConsentOpen(false); setState("compressing"); setAnnouncement("Gambar sedang dikompresi di browser.");
        uploadFile = await compressImage(file, policy.max_image_bytes);
      }
      setState("uploading"); setAnnouncement("Berkas sedang diunggah dan divalidasi server.");
      const form = new FormData();
      form.append("file", uploadFile); form.append("title", title.trim()); form.append("alt_text", decorative ? "" : altText.trim()); form.append("caption", caption.trim());
      const response = await fetch("/api/bff/media", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || payload.title || "Media belum dapat diunggah");
      const asset = payload.data as MediaAsset;
      setAnnouncement("Media berhasil diunggah.");
      onUploaded?.({ ...asset, insertion_alt_text: decorative ? "" : altText.trim(), decorative });
      setFile(null); setTitle(""); setAltText(""); setCaption(""); setDecorative(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media belum dapat diunggah");
      setAnnouncement("Unggah gagal.");
    } finally { setState("idle"); }
  };

  return (
    <div className={compact ? "space-y-5" : "admin-card mb-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"}>
      {!compact && (
        <div className="border-b border-slate-100 dark:border-slate-800 p-6 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="admin-stat-icon flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
              <AdminIcon name="media" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Unggah Media Baru</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kebijakan ukuran dan format berkas diverifikasi secara ketat oleh server.</p>
            </div>
          </div>
        </div>
      )}
      <div className={compact ? "space-y-5" : "p-6 sm:p-7 space-y-6"}>
        <label
          htmlFor={inputId}
          className="admin-accent-control flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-8 sm:p-10 text-center transition hover:border-sky-500 dark:hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-sky-950/20"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            chooseFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 shadow-sm mb-3">
            <AdminIcon name="media" className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Tarik berkas ke sini atau klik untuk memilih</span>
          <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Format didukung: JPG, PNG, WEBP, PDF, MP4, WEBM · Batas ukuran sesuai kebijakan policy server</span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.webm,image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"
          className="sr-only"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
        />
        {file && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 font-bold text-xs">
                {file.type.split("/")[1]?.toUpperCase().slice(0, 4) || "FILE"}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)} · {file.type}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => chooseFile(null)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 shrink-0"
            >
              Ganti Berkas
            </button>
          </div>
        )}
        {file && (
          <div className="grid gap-5 sm:grid-cols-2 pt-1">
            <div>
              <label className="admin-label font-bold text-slate-800 dark:text-slate-200" htmlFor={`${inputId}-title`}>
                Judul Berkas
              </label>
              <input
                id={`${inputId}-title`}
                className="admin-input mt-1.5"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={255}
                placeholder="Nama tampilan media..."
              />
            </div>
            <div>
              <label className="admin-label font-bold text-slate-800 dark:text-slate-200" htmlFor={`${inputId}-alt`}>
                Teks Alternatif Gambar (Alt Text)
              </label>
              <input
                id={`${inputId}-alt`}
                className="admin-input mt-1.5"
                value={altText}
                disabled={decorative || !file.type.startsWith("image/")}
                onChange={(event) => setAltText(event.target.value)}
                maxLength={255}
                placeholder="Deskripsi gambar untuk aksesibilitas..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="admin-label font-bold text-slate-800 dark:text-slate-200" htmlFor={`${inputId}-caption`}>
                Keterangan
              </label>
              <textarea
                id={`${inputId}-caption`}
                className="admin-input mt-1.5"
                rows={3}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2000}
                placeholder="Catatan atau keterangan konteks penggunaan media..."
              />
            </div>
            {file.type.startsWith("image/") && (
              <label className="sm:col-span-2 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  className="cuba-checkbox rounded text-sky-600"
                  checked={decorative}
                  onChange={(event) => setDecorative(event.target.checked)}
                />
                Gambar bersifat dekoratif (teks alternatif sengaja dikosongkan)
              </label>
            )}
          </div>
        )}
        {error && (
          <div className="admin-alert-error rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300" role="alert">
            {error}
          </div>
        )}
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {consentOpen && file && (
          <div className="rounded-2xl border border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 p-5" role="alertdialog" aria-labelledby={`${inputId}-consent-title`}>
            <h3 id={`${inputId}-consent-title`} className="font-extrabold text-sm text-slate-900 dark:text-white">
              Izinkan kompresi gambar otomatis?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ukuran berkas ({formatBytes(file.size)}) melebihi batas 2,5 MiB. Sistem peramban dapat mengompresi dimensi dan resolusi gambar secara proporsional sebelum diunggah ke penyimpanan.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button type="button" className="admin-button !py-2.5 !px-4 shadow-sm text-xs font-bold" onClick={() => void upload(true)}>
                Setuju dan kompres
              </button>
              <button type="button" className="admin-button-secondary !py-2.5 !px-4 shadow-sm text-xs font-bold" onClick={() => setConsentOpen(false)}>
                Batal
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="admin-button text-xs font-bold"
            disabled={!file || !policy || state !== "idle"}
            onClick={() => void upload(false)}
          >
            {state === "compressing" ? "Mengompresi Berkas…" : state === "uploading" ? "Mengunggah Berkas…" : "Unggah Media"}
          </button>
        </div>
      </div>
    </div>
  );
}
