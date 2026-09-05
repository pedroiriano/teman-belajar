"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionKnowledgeAction, getAdminKnowledgeDetailAction, createKnowledgeRevisionAction, assignKnowledgeArticleNodeAction } from "@/app/actions/knowledge";
import MediaPicker from "@/components/media/MediaPicker";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import { KnowledgeNodeSelect } from "@/components/knowledge/KnowledgeNodeSelect";
import { CubaMarkdownEditor } from "@/components/editor/cuba-markdown-editor";
import { AdminMarkdownRenderer } from "@/components/editor/admin-markdown-renderer";
import { getDiscoverabilityProfileAction, saveDiscoverabilityProfileAction } from "@/app/actions/discoverability";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, profileToSEOValue, type DiscoverabilityProfile, type SEOFormValue } from "@/components/seo/types";
import { AdminIcon } from "@/components/admin-icon";
import { CubaContentVersioningPanel } from "@/components/versioning/cuba-content-versioning-panel";
import { getReviewNotesAction, type ReviewNote } from "@/app/actions/review-notes";
import { CubaReviewNotesCard } from "@/components/review-notes/cuba-review-notes-card";

type KnowledgeEditDraft = DraftPayload & SEOFormValue & { body: string; primary_node_id: string | null; media_asset_ids: string[] };
const blankDraft: KnowledgeEditDraft = { ...emptySEOValue(), body: "", primary_node_id: null, media_asset_ids: [] };

const statusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

const statusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

export default function AdminKnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [primaryNodeId, setPrimaryNodeId] = useState("");
  const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue());
  const [activeTab, setActiveTab] = useState<"content" | "versioning">("content");
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const [res, notesRes] = await Promise.all([
          getAdminKnowledgeDetailAction(id),
          getReviewNotesAction("knowledge", id),
        ]);
        if (!res.success) {
          setError(res.error || "Artikel pengetahuan belum dapat dimuat");
          return;
        }
        if (notesRes.success && notesRes.data) {
          setReviewNotes(notesRes.data);
        }
        
		const profileResult = await getDiscoverabilityProfileAction("knowledge", id);
		if (!profileResult.success) { setError(profileResult.error || "SEO & Discovery belum dapat dimuat"); return; }
		const seoValue = profileToSEOValue(profileResult.data as DiscoverabilityProfile);
		setArticle({ ...res.data, seo_profile: seoValue });
		setBody(res.data?.body || "");
		setPrimaryNodeId(res.data?.hierarchy?.node_id || "");
		setSEO(seoValue);
		setRoles(res.roles || []);
      } catch (e) {
        setError("Artikel pengetahuan belum dapat dimuat");
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [id]);

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");
  const canCreateRevision = Boolean(article && isEditor && ["draft", "published"].includes(article.status));
  const value = useMemo<KnowledgeEditDraft>(() => ({ ...seo, body, primary_node_id: primaryNodeId || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))] }), [body, primaryNodeId, seo]);
  const canonical = useMemo<KnowledgeEditDraft>(() => article ? { ...(article.seo_profile || emptySEOValue(article.slug)), body: article.body || "", primary_node_id: article.hierarchy?.node_id || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(article.body || "").map((usage) => usage.media_id))] } : blankDraft, [article]);
  const applyDraft = (draft: KnowledgeEditDraft) => { setSEO(pickSEOValue(draft)); setBody(draft.body); setPrimaryNodeId(draft.primary_node_id ?? ""); };
  const autoSave = useAutoSaveDraft({ formKey: "knowledge.edit", entityType: "knowledge", entityId: id, baseEntityVersion: article ? String(article.current_revision_no) : undefined, value, emptyValue: canonical, enabled: canCreateRevision, onRecover: applyDraft, onStartNew: applyDraft });
  const insertMedia = (selection: MediaSelection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); };

  const handleTransition = async (status: string) => {
    setActionLoading(true);
    setError("");
    const res = await transitionKnowledgeAction(id, status);
    if (!res.success) {
      setError(res.error || "Status artikel belum dapat diperbarui");
      setActionLoading(false);
    } else {
      router.push("/dashboard/knowledge");
    }
  };

  const handleSave = async () => {
    setActionLoading(true);
    setError("");
    if (!primaryNodeId) {
      setError("Pilih struktur utama sebelum menyimpan artikel.");
      setActionLoading(false);
      return;
    }
    const contentDirty = article.body !== body;
    const hierarchyDirty = primaryNodeId !== (article.hierarchy?.node_id || "");
    if (contentDirty || hierarchyDirty) {
      const revisionResult = !contentDirty && hierarchyDirty
        ? await assignKnowledgeArticleNodeAction(id, primaryNodeId)
        : await createKnowledgeRevisionAction(id, { body, expected_revision_no: article.current_revision_no, seo, primary_node_id: primaryNodeId || undefined, media_usages: mediaUsagesFromMarkdown(body) });
      if (!revisionResult.success) {
        setError(revisionResult.error || "Revisi baru belum dapat disimpan");
        setActionLoading(false);
        return;
      }
    }
    const seoResult = await saveDiscoverabilityProfileAction("knowledge", id, seo);
    if (!seoResult.success) { setError(seoResult.error || "Pengaturan publikasi belum dapat disimpan"); setActionLoading(false); return; }
    await autoSave.finalize();
    router.push("/dashboard/knowledge");
  };

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100 dark:bg-slate-800" /><div className="mt-6 h-72 rounded-xl bg-slate-100 dark:bg-slate-800" /></div>;
  if (!article) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900 dark:text-white">Artikel tidak tersedia</h1><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{error}</p><Link href="/dashboard/knowledge" className="admin-button mt-6">Kembali</Link></div>;

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header">
        <div>
          <Link href="/dashboard/knowledge" className="text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Pengetahuan</Link>
          <p className="admin-kicker mt-5">Detail editorial</p>
          <h1 className="admin-page-title">{article.title}</h1>
          <p className="admin-page-copy">Kelola revisi serta transisi peninjauan dan publikasi.</p>
        </div>
        <span className={`cuba-badge ${statusBadgeClasses[article.status] || "cuba-badge-neutral"}`}>{statusLabels[article.status] || article.status}</span>
      </div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "content"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <AdminIcon name="edit" className="h-4 w-4" />
          <span>Edit Konten</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("versioning")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "versioning"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <AdminIcon name="clock" className="h-4 w-4" />
          <span>Riwayat Revisi & Diff</span>
        </button>
      </div>

      {activeTab === "versioning" ? (
        <CubaContentVersioningPanel
          module="knowledge"
          articleId={id}
          onRollbackComplete={() => {
            router.refresh();
          }}
        />
      ) : (
        <>
          {canCreateRevision && <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={false} />}
          <CubaReviewNotesCard
            entityType="knowledge"
            entityId={id}
            notes={reviewNotes}
            canAddNote={isEditor || isReviewer}
            onNoteAdded={(newNote) => setReviewNotes((prev) => [newNote, ...prev])}
            className="mb-6"
          />
          <section className="admin-form-card">
              <div className="admin-form-header flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-black text-slate-900 dark:text-white">Alur publikasi</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Aksi mengikuti status dan peran editorial.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  
                  {article.status === 'draft' && isEditor && (
                    <button 
                      onClick={() => handleTransition('in_review')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Ajukan peninjauan
                    </button>
                  )}

                  {article.status === 'in_review' && isReviewer && (
                    <>
                      <button 
                        onClick={() => handleTransition('draft')} 
                        disabled={actionLoading}
                        className="admin-button-secondary !text-rose-700"
                      >
                        Kembalikan ke draf
                      </button>
                      <button 
                        onClick={() => handleTransition('approved')} 
                        disabled={actionLoading}
                        className="admin-button"
                      >
                        Setujui
                      </button>
                    </>
                  )}

                  {article.status === 'approved' && isReviewer && (
                    <button 
                      onClick={() => handleTransition('published')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Terbitkan
                    </button>
                  )}

                  {article.status === 'published' && (isEditor || isReviewer) && (
                    <button 
                      onClick={() => handleTransition('archived')} 
                      disabled={actionLoading}
                      className="admin-button-secondary"
                    >
                      Arsipkan
                    </button>
                  )}
                </div>
              </div>
              
              <div className="admin-form-body">
                <div>
                  <h3 className="admin-label">Ringkasan</h3>
                  <p className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-sm leading-7 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800">{article.summary || "Belum ada ringkasan."}</p>
                </div>
                <div>
                  <h3 className="admin-label">Isi artikel saat ini</h3>
                
                {!canCreateRevision ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-5">
                    <AdminMarkdownRenderer content={article.body} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <KnowledgeNodeSelect value={primaryNodeId} onChange={setPrimaryNodeId} required disabled={!canCreateRevision} />
                    <CubaMarkdownEditor
                      id="knowledge-revision-body"
                      value={body}
                      onChange={setBody}
                      rows={14}
                      placeholder="Tulis revisi artikel dalam Markdown yang terstruktur…"
                      mediaPickerSlot={<MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" />}
                    />
                  </div>
                )}
                </div>
              </div>
              {canCreateRevision && <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={article.title} contentSummary={article.summary || ""} contentBody={body || article.body || ""} routePrefix="/knowledge/" />}
              {canCreateRevision && <div className="admin-form-footer"><button type="button" className="admin-button" disabled={actionLoading || !primaryNodeId || !body} onClick={handleSave}>Simpan perubahan</button></div>}
          </section>
          {!canCreateRevision && <SeoDiscoverySection compact value={seo} onChange={setSEO} contentTitle={article.title} contentSummary={article.summary || ""} contentBody={body || article.body || ""} routePrefix="/knowledge/" disabled />}
        </>
      )}
    </div>
  );
}
