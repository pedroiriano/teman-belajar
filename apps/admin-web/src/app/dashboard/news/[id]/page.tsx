"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionNewsAction, getAdminNewsAction, updateNewsAction } from "@/app/actions/cms";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import MediaPicker from "@/components/media/MediaPicker";
import { CubaMarkdownEditor } from "@/components/editor/cuba-markdown-editor";
import { AdminMarkdownRenderer } from "@/components/editor/admin-markdown-renderer";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";
import { getDiscoverabilityProfileAction, saveDiscoverabilityProfileAction } from "@/app/actions/discoverability";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, profileToSEOValue, type DiscoverabilityProfile, type SEOFormValue } from "@/components/seo/types";
import { AdminIcon } from "@/components/admin-icon";
import { CubaContentVersioningPanel } from "@/components/versioning/cuba-content-versioning-panel";

type NewsEditDraft = DraftPayload & SEOFormValue & { title: string; excerpt: string; body: string; media_asset_ids: string[] };
const blankDraft: NewsEditDraft = { ...emptySEOValue(), title: "", excerpt: "", body: "", media_asset_ids: [] };

const statusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Arsip",
};

const statusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

export default function AdminNewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [news, setNews] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue());
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "versioning">("content");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await getAdminNewsAction();
        if (!res.success) {
          setError(res.error || "Berita belum dapat dimuat");
          return;
        }
        
        const found = res.data?.find((n: any) => n.id === id);
		setRoles(res.roles || []);
        if (found) {
          const profileResult = await getDiscoverabilityProfileAction("news", id);
          if (!profileResult.success) { setError(profileResult.error || "SEO & Discovery belum dapat dimuat"); return; }
          const seoValue = profileToSEOValue(profileResult.data as DiscoverabilityProfile);
          setNews({ ...found, seo_profile: seoValue });
          setTitle(found.title); setSEO(seoValue); setExcerpt(found.excerpt || ""); setBody(found.body || "");
        } else {
          setError("Berita tidak ditemukan");
        }
      } catch (e) {
        setError("Berita belum dapat dimuat");
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, [id]);

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");
  const canEdit = Boolean(news && isEditor && news.status === "draft");
  const canEditSEO = Boolean(news && isEditor && ["draft", "published"].includes(news.status));
  const value = useMemo<NewsEditDraft>(() => ({ ...seo, title, excerpt, body, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))] }), [body, excerpt, seo, title]);
  const canonical = useMemo<NewsEditDraft>(() => news ? { ...(news.seo_profile || emptySEOValue(news.slug)), title: news.title, excerpt: news.excerpt || "", body: news.body || "", media_asset_ids: [...new Set(mediaUsagesFromMarkdown(news.body || "").map((usage) => usage.media_id))] } : blankDraft, [news]);
  const applyDraft = (draft: NewsEditDraft) => { setTitle(draft.title); setSEO(pickSEOValue(draft)); setExcerpt(draft.excerpt); setBody(draft.body); };
  const autoSave = useAutoSaveDraft({ formKey: "news.edit", entityType: "news", entityId: id, baseEntityVersion: news ? String(news.version) : undefined, value, emptyValue: canonical, enabled: canEditSEO, onRecover: applyDraft, onStartNew: applyDraft });

  const handleTransition = async (status: string) => {
    setActionLoading(true);
    setError("");
    const res = await transitionNewsAction(id, status);
    if (!res.success) {
      setError(res.error || "Status berita belum dapat diperbarui");
      setActionLoading(false);
    } else {
      router.push("/dashboard/news");
    }
  };

  const handleSave = async () => {
    setActionLoading(true); setError("");
    const result = await updateNewsAction(id, { title, slug: seo.slug, excerpt, body, expected_version: news.version, seo, media_usages: mediaUsagesFromMarkdown(body) });
    if (!result.success) { setError(result.error || "Berita belum dapat diperbarui"); setActionLoading(false); return; }
    await autoSave.finalize(); router.push("/dashboard/news");
  };

  const handleSaveSEO = async () => {
    setActionLoading(true); setError("");
    const result = await saveDiscoverabilityProfileAction("news", id, seo);
    if (!result.success) { setError(result.error || "SEO & Discovery belum dapat disimpan"); setActionLoading(false); return; }
    await autoSave.finalize(); router.refresh(); setActionLoading(false);
  };

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100" /><div className="mt-6 h-52 rounded-xl bg-slate-100" /></div>;
  if (!news) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900">Berita tidak tersedia</h1><p className="mt-3 text-sm text-slate-500">{error}</p><Link href="/dashboard/news" className="admin-button mt-6">Kembali</Link></div>;

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header">
        <div><Link href="/dashboard/news" className="text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Berita</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{news.title}</h1><p className="admin-page-copy">Tinjau konten dan jalankan transisi sesuai peran editorial.</p></div>
        <span className={`cuba-badge ${statusBadgeClasses[news.status] || "cuba-badge-neutral"}`}>{statusLabels[news.status] || news.status}</span>
      </div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}

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
          module="news"
          articleId={id}
          onRollbackComplete={() => {
            router.refresh();
          }}
        />
      ) : (
        <>
          {canEdit && <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={false} />}
          <section className="admin-form-card">
              <div className="admin-form-header flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="font-black text-slate-900 dark:text-white">Alur publikasi</h2><p className="mt-1 text-xs text-slate-500">Aksi yang tersedia mengikuti status dan peran Anda.</p></div>
                <div className="flex flex-wrap gap-2">
                  
                  {news.status === 'draft' && isEditor && (
                    <button 
                      onClick={() => handleTransition('in_review')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Ajukan peninjauan
                    </button>
                  )}

                  {news.status === 'in_review' && isReviewer && (
                    <>
                      <button 
                        onClick={() => handleTransition('draft')} 
                        disabled={actionLoading}
                        className="admin-button-secondary !text-rose-700 hover:!border-rose-300"
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

                  {news.status === 'approved' && isReviewer && (
                    <button 
                      onClick={() => handleTransition('published')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Terbitkan
                    </button>
                  )}

                  {news.status === 'published' && (isEditor || isReviewer) && (
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
                {canEdit ? (
                  <>
                    <div>
                      <label className="admin-label" htmlFor="news-title">Judul berita</label>
                      <input id="news-title" type="text" className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="news-excerpt">Ringkasan singkat</label>
                      <textarea id="news-excerpt" className="admin-textarea" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="news-body">Konten berita</label>
                      <CubaMarkdownEditor
                        id="news-body"
                        value={body}
                        onChange={setBody}
                        rows={14}
                        placeholder="Tulis konten berita dalam format Markdown…"
                        mediaPickerSlot={<MediaPicker onSelect={(selection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); }} buttonLabel="Sisipkan media" />}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="admin-label">Ringkasan</h3>
                      <p className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-sm leading-7 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800">{news.excerpt || "Belum ada ringkasan."}</p>
                    </div>
                    <div>
                      <h3 className="admin-label">Isi berita</h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-5">
                        <AdminMarkdownRenderer content={news.body} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {canEdit && <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title || news.title} contentSummary={excerpt || news.excerpt || ""} contentBody={body || news.body || ""} routePrefix="/news/" />}
              {canEdit && <div className="admin-form-footer"><button type="button" className="admin-button" disabled={actionLoading || !title || !seo.slug || !body} onClick={handleSave}>Simpan perubahan</button></div>}
          </section>
          {!canEdit && <SeoDiscoverySection compact value={seo} onChange={setSEO} contentTitle={title || news.title} contentSummary={excerpt || news.excerpt || ""} contentBody={body || news.body || ""} routePrefix="/news/" disabled={!canEditSEO} />}
          {!canEdit && canEditSEO && <div className="flex justify-end"><button type="button" className="admin-button" disabled={actionLoading} onClick={handleSaveSEO}>Simpan pengaturan publikasi</button></div>}
        </>
      )}
    </div>
  );
}
