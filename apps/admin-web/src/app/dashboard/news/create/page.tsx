"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createNewsAction } from "@/app/actions/cms";
import { AdminIcon } from "@/components/admin-icon";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import MediaPicker from "@/components/media/MediaPicker";
import { CubaMarkdownEditor } from "@/components/editor/cuba-markdown-editor";
import type { MediaSelection } from "@/components/media/types";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, type SEOFormValue } from "@/components/seo/types";

type NewsDraft = DraftPayload & SEOFormValue & { title: string; excerpt: string; body: string; media_asset_ids: string[] };
const emptyDraft: NewsDraft = { ...emptySEOValue(), title: "", excerpt: "", body: "", media_asset_ids: [] };
const mediaIDs = (body: string) => [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))];

export default function CreateNewsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue());
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const value = useMemo<NewsDraft>(() => ({ ...seo, title, excerpt, body, media_asset_ids: mediaIDs(body) }), [body, excerpt, seo, title]);
  const applyDraft = (draft: NewsDraft) => { setTitle(draft.title); setSEO(pickSEOValue(draft)); setExcerpt(draft.excerpt); setBody(draft.body); };
  const autoSave = useAutoSaveDraft({ formKey: "news.create", entityType: "news", value, emptyValue: emptyDraft, onRecover: applyDraft, onStartNew: applyDraft });

  const handleTitleChange = (next: string) => { setTitle(next); setSEO((current) => ({ ...current, slug: next.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") })); };
  const insertMedia = (selection: MediaSelection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await createNewsAction({ title, slug: seo.slug, excerpt, body, seo, media_usages: mediaUsagesFromMarkdown(body) });
      if (!result.success) throw new Error(result.error || "Berita belum dapat disimpan");
      await autoSave.finalize();
      router.push("/dashboard/news");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Terjadi kesalahan yang tidak terduga"); } finally { setLoading(false); }
  };

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header">
        <div>
          <Link href="/dashboard/news" className="inline-flex items-center text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Berita</Link>
          <p className="admin-kicker mt-5">Editor berita</p>
          <h1 className="admin-page-title">Buat berita baru</h1>
          <p className="admin-page-copy">Berita disimpan sebagai draf sebelum masuk proses peninjauan.</p>
        </div>
        <span className="cuba-badge cuba-badge-neutral">Draf</span>
      </div>
      <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} />
      <form onSubmit={handleSubmit} className="admin-form-card">
        <div className="admin-form-header">
          <div className="flex items-center gap-3">
            <span className="admin-stat-icon"><AdminIcon name="news" className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">Informasi berita</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lengkapi judul, ringkasan, dan isi publikasi.</p>
            </div>
          </div>
        </div>
        <div className="admin-form-body">
          {error && <div className="admin-alert-error" role="alert">{error}</div>}
          <div>
            <label htmlFor="news-title" className="admin-label">Judul <span className="text-rose-600">*</span></label>
            <input id="news-title" required value={title} onChange={(event) => handleTitleChange(event.target.value)} className="admin-input" placeholder="Contoh: Program Pembelajaran Kuartal Ketiga" />
          </div>
          <div>
            <label htmlFor="news-excerpt" className="admin-label">Ringkasan</label>
            <textarea id="news-excerpt" rows={3} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} className="admin-input" placeholder="Ringkasan singkat yang tampil pada kartu berita." />
          </div>
          <CubaMarkdownEditor
            id="news-body"
            value={body}
            onChange={setBody}
            label="Isi berita"
            required
            rows={14}
            placeholder="Tulis isi berita dalam Markdown yang terstruktur…"
            mediaPickerSlot={<MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" />}
          />
        </div>
      <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title} contentSummary={excerpt} contentBody={body} routePrefix="/news/" />
      <div className="admin-form-footer"><Link href="/dashboard/news" className="admin-button-secondary">Batal</Link><button type="submit" disabled={loading} className="admin-button">{loading ? "Menyimpan…" : "Simpan draf berita"}</button></div>
    </form>
  </div>
  );
}
