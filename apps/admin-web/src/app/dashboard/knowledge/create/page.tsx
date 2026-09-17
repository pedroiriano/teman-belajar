"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createKnowledgeAction } from "@/app/actions/knowledge";
import { AdminIcon } from "@/components/admin-icon";

import MediaPicker from "@/components/media/MediaPicker";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import { KnowledgeNodeSelect } from "@/components/knowledge/KnowledgeNodeSelect";
import { CubaMarkdownEditor } from "@/components/editor/cuba-markdown-editor";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, type SEOFormValue } from "@/components/seo/types";

type KnowledgeDraft = DraftPayload & SEOFormValue & { title: string; summary: string; body: string; primary_node_id: string | null; media_asset_ids: string[] };
const emptyDraft: KnowledgeDraft = { ...emptySEOValue(), title: "", summary: "", body: "", primary_node_id: null, media_asset_ids: [] };

export default function CreateKnowledgePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue());
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [primaryNodeId, setPrimaryNodeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const value = useMemo<KnowledgeDraft>(() => ({
    ...seo, title, summary, body, primary_node_id: primaryNodeId || null,
    media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))],
  }), [body, primaryNodeId, seo, summary, title]);
  const applyDraft = (draft: KnowledgeDraft) => { setTitle(draft.title); setSEO(pickSEOValue(draft)); setSummary(draft.summary); setBody(draft.body); setPrimaryNodeId(draft.primary_node_id ?? ""); };
  const autoSave = useAutoSaveDraft({ formKey: "knowledge.create", entityType: "knowledge", value, emptyValue: emptyDraft, onRecover: applyDraft, onStartNew: applyDraft });

  // Auto-generate slug from title
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
      const res = await createKnowledgeAction({ title, slug: seo.slug, summary, body, seo, primary_node_id: primaryNodeId || undefined, media_usages: mediaUsagesFromMarkdown(body) });

      if (!res.success) {
        throw new Error(res.error || "Artikel pengetahuan belum dapat dibuat");
      }

      await autoSave.finalize();
      router.push("/dashboard/knowledge");
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
          <Link href="/dashboard/knowledge" className="text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Pusat Pengetahuan</Link>
          <p className="admin-kicker mt-5">Editor pengetahuan</p>
          <h1 className="admin-page-title">Buat artikel baru</h1>
          <p className="admin-page-copy">Susun pengetahuan yang jelas dan siap melewati peninjauan editorial.</p>
        </div>
        <span className="cuba-badge cuba-badge-neutral">Draf</span>
      </div>
      <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} />
      <form onSubmit={handleSubmit} className="admin-form-card">
        <div className="admin-form-header">
          <div className="flex items-center gap-3">
            <span className="admin-stat-icon"><AdminIcon name="knowledge" className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">Informasi artikel</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Judul dan ringkasan membantu artikel mudah ditemukan.</p>
            </div>
          </div>
        </div>
        <div className="admin-form-body">
            <div>
              <div className="space-y-2">
                <label htmlFor="knowledge-title" className="admin-label">Judul <span className="text-rose-600">*</span></label>
                <input 
                  id="knowledge-title"
                  type="text" 
                  required
                  value={title}
                  onChange={handleTitleChange}
                  className="admin-input"
                  placeholder="Contoh: Panduan kerja kolaboratif"
                />
              </div>
            </div>

            <div className="space-y-2">
            <label htmlFor="summary" className="admin-label">
              Ringkasan
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="admin-input"
              rows={3}
              placeholder="Jelaskan manfaat artikel secara singkat."
            />
          </div>

          <KnowledgeNodeSelect value={primaryNodeId} onChange={setPrimaryNodeId} required />

            <CubaMarkdownEditor
              id="knowledge-body"
              value={body}
              onChange={setBody}
              label="Isi artikel"
              required
              rows={12}
              placeholder="Tulis panduan atau pengetahuan dalam teks yang terstruktur..."
              mediaPickerSlot={<MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" />}
            />

          </div>
        <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title} contentSummary={summary} contentBody={body} routePrefix="/knowledge/" />
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
            Pastikan judul, ringkasan, topik utama, dan konten artikel telah lengkap sebelum disimpan sebagai draf.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/knowledge" className="admin-button-secondary">
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

