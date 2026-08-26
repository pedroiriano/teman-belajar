"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionNewsAction, getAdminNewsAction, updateNewsAction } from "@/app/actions/cms";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import MediaPicker from "@/components/media/MediaPicker";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";
import { getDiscoverabilityProfileAction, saveDiscoverabilityProfileAction } from "@/app/actions/discoverability";
import { SeoDiscoverySection } from "@/components/seo/SeoDiscoverySection";
import { emptySEOValue, pickSEOValue, profileToSEOValue, type DiscoverabilityProfile, type SEOFormValue } from "@/components/seo/types";

type NewsEditDraft = DraftPayload & SEOFormValue & { title: string; excerpt: string; body: string; media_asset_ids: string[] };
const blankDraft: NewsEditDraft = { ...emptySEOValue(), title: "", excerpt: "", body: "", media_asset_ids: [] };

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
        <div><Link href="/dashboard/news" className="text-sm font-bold text-sky-700">&larr; Kembali ke Berita</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{news.title}</h1><p className="admin-page-copy">Tinjau konten dan jalankan transisi sesuai peran editorial.</p></div>
        <span className="admin-status bg-sky-50 text-sky-800">{news.status}</span>
      </div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
      {canEdit && <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={false} />}
      <section className="admin-form-card">
          <div className="admin-form-header flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-black text-slate-900">Alur publikasi</h2><p className="mt-1 text-xs text-slate-500">Aksi yang tersedia mengikuti status dan peran Anda.</p></div>
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
            {canEdit ? <><div><label htmlFor="news-edit-title" className="admin-label">Judul *</label><input id="news-edit-title" className="admin-input" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><label htmlFor="news-edit-excerpt" className="admin-label">Ringkasan</label><textarea id="news-edit-excerpt" className="admin-input" rows={3} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></div><div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="news-edit-body" className="admin-label !mb-0">Isi berita *</label><MediaPicker onSelect={(selection: MediaSelection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); }} buttonLabel="Sisipkan media" /></div><textarea id="news-edit-body" className="admin-input font-mono" rows={14} value={body} onChange={(event) => setBody(event.target.value)} /></div></> : <><div><h3 className="admin-label">Ringkasan</h3><p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{news.excerpt || "Belum ada ringkasan."}</p></div><div><h3 className="admin-label">Isi berita</h3><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-600 whitespace-pre-wrap">{news.body}</div></div></>}
          </div>
          {canEdit && <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title || news.title} contentSummary={excerpt || news.excerpt || ""} contentBody={body || news.body || ""} routePrefix="/news/" />}
          {canEdit && <div className="admin-form-footer"><button type="button" className="admin-button" disabled={actionLoading || !title || !seo.slug || !body} onClick={handleSave}>Simpan perubahan</button></div>}
      </section>
      {!canEdit && <SeoDiscoverySection compact value={seo} onChange={setSEO} contentTitle={title || news.title} contentSummary={excerpt || news.excerpt || ""} contentBody={body || news.body || ""} routePrefix="/news/" disabled={!canEditSEO} />}
      {!canEdit && canEditSEO && <div className="flex justify-end"><button type="button" className="admin-button" disabled={actionLoading} onClick={handleSaveSEO}>Simpan pengaturan publikasi</button></div>}
    </div>
  );
}
