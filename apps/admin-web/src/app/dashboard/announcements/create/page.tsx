"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAnnouncementAction } from "@/app/actions/cms";
import { AdminIcon } from "@/components/admin-icon";

import MediaPicker from "@/components/media/MediaPicker";
import { CubaMarkdownEditor } from "@/components/editor/cuba-markdown-editor";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, type SEOFormValue } from "@/components/seo/types";

type AnnouncementDraft = DraftPayload & SEOFormValue & { title: string; body: string; start_at: string | null; end_at: string | null; media_asset_ids: string[] };
const emptyDraft: AnnouncementDraft = { ...emptySEOValue(), title: "", body: "", start_at: null, end_at: null, media_asset_ids: [] };

export default function CreateAnnouncementPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue());
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const value = useMemo<AnnouncementDraft>(() => ({
    ...seo, title, body, start_at: startAt || null, end_at: endAt || null,
    media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))],
  }), [body, endAt, seo, startAt, title]);
  const applyDraft = (draft: AnnouncementDraft) => {
    setTitle(draft.title); setSEO(pickSEOValue(draft)); setBody(draft.body);
    setStartAt(draft.start_at ?? ""); setEndAt(draft.end_at ?? "");
  };
  const autoSave = useAutoSaveDraft({ formKey: "announcement.create", entityType: "announcement", value, emptyValue: emptyDraft, onRecover: applyDraft, onStartNew: applyDraft });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSEO((current) => ({ ...current, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') }));
  };

  const insertMedia = (selection: MediaSelection) => {
    setBody((prev) => `${prev}\n${mediaMarkdown(selection)}\n`);
    autoSave.requestImmediateSave();
  };

const isSessionExpired = (msg: string) =>
  /sesi|token|unauthorized|401|403|login|kedaluwarsa|konflik/i.test(msg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const parsedStart = startAt ? new Date(startAt) : null;
      const parsedEnd = endAt ? new Date(endAt) : null;
      
      const res = await createAnnouncementAction({ 
        title, 
        slug: seo.slug,
        body, 
        start_at: parsedStart, 
        end_at: parsedEnd,
        seo,
        media_usages: mediaUsagesFromMarkdown(body)
      });

      if (!res.success) {
        throw new Error(res.error || "Pengumuman belum dapat dibuat");
      }

      await autoSave.finalize();
      router.push("/dashboard/announcements");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga";
      setError(msg);
      setTimeout(() => {
        document.getElementById("form-error-alert")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header">
        <div>
          <Link href="/dashboard/announcements" className="text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Pengumuman</Link>
          <p className="admin-kicker mt-5">Editor pengumuman</p>
          <h1 className="admin-page-title">Buat pengumuman baru</h1>
          <p className="admin-page-copy">Atur periode tayang agar informasi muncul pada waktu yang tepat.</p>
        </div>
        <span className="cuba-badge cuba-badge-neutral">Draf</span>
      </div>
      <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} />
      <form onSubmit={handleSubmit} className="admin-form-card">
        <div className="admin-form-header">
          <div className="flex items-center gap-3">
            <span className="admin-stat-icon"><AdminIcon name="announcement" className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">Informasi pengumuman</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lengkapi isi dan jadwal publikasi.</p>
            </div>
          </div>
        </div>
        <div className="admin-form-body">
            <div>
              <div className="space-y-2">
                <label htmlFor="announcement-title" className="admin-label">Judul <span className="text-rose-600">*</span></label>
                <input 
                  id="announcement-title"
                  type="text" 
                  required
                  value={title}
                  onChange={handleTitleChange}
                  className="admin-input"
                  placeholder="Contoh: Jadwal pemeliharaan platform"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="announcement-start" className="admin-label">Mulai tayang</label>
                <input 
                  id="announcement-start"
                  type="datetime-local" 
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="announcement-end" className="admin-label">Selesai tayang</label>
                <input 
                  id="announcement-end"
                  type="datetime-local" 
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="admin-input"
                />
              </div>
            </div>

            <CubaMarkdownEditor
              id="announcement-body"
              value={body}
              onChange={setBody}
              label="Isi pengumuman"
              required
              rows={12}
              placeholder="Tulis isi pengumuman dalam Markdown…"
              mediaPickerSlot={<MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" />}
            />

          </div>
        <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title} contentSummary={body.slice(0, 300)} contentBody={body} routePrefix="/announcements/" />
        {error && (
          <div className="p-5 sm:px-7 pb-0">
            <div
              id="form-error-alert"
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold text-base leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="font-bold text-rose-800 dark:text-rose-300">Gagal Menyimpan:</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">{error}</p>
                </div>
              </div>
              {isSessionExpired(error) && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="admin-button text-xs whitespace-nowrap self-stretch sm:self-auto py-2 px-3 flex items-center justify-center gap-1.5"
                >
                  <AdminIcon name="refresh" className="h-3.5 w-3.5" />
                  Muat Ulang Halaman &amp; Masuk Ulang
                </button>
              )}
            </div>
          </div>
        )}
        <div className="admin-form-footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pengumuman akan disimpan sebagai draf sebelum ditinjau dan diterbitkan sesuai jadwal.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/announcements" className="admin-button-secondary">
              Batal
            </Link>
            <button type="submit" disabled={loading} className="admin-button">
              {loading ? "Menyimpan…" : "Simpan draf"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

