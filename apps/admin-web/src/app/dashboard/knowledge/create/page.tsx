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
      setError(err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header">
        <div><Link href="/dashboard/knowledge" className="text-sm font-bold text-sky-700">← Kembali ke Pusat Pengetahuan</Link><p className="admin-kicker mt-5">Editor pengetahuan</p><h1 className="admin-page-title">Buat artikel baru</h1><p className="admin-page-copy">Susun pengetahuan yang jelas dan siap melewati review editorial.</p></div>
        <span className="admin-status bg-slate-100 text-slate-600">Status: Draft</span>
      </div>
      <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} />
      <form onSubmit={handleSubmit} className="admin-form-card">
        <div className="admin-form-header"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="knowledge" className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Informasi artikel</h2><p className="mt-1 text-xs text-slate-500">Judul dan ringkasan membantu artikel mudah ditemukan.</p></div></div></div>
        <div className="admin-form-body">
            {error && (
              <div className="admin-alert-error" role="alert">
                {error}
              </div>
            )}
            
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

            <div className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="knowledge-body" className="admin-label">Isi artikel <span className="text-rose-600">*</span></label>
                <MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" />
              </div>
              <textarea id="knowledge-body"
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="admin-input font-mono"
                placeholder="Tulis panduan atau pengetahuan dalam teks yang terstruktur..."
              />
            </div>

          </div>
        <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title} contentSummary={summary} contentBody={body} routePrefix="/knowledge/" />
        <div className="admin-form-footer"><Link href="/dashboard/knowledge" className="admin-button-secondary">Batal</Link><button type="submit" disabled={loading} className="admin-button">{loading ? "Menyimpan…" : "Simpan draft"}</button></div>
      </form>
    </div>
  );
}

