"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionAnnouncementAction, getAdminAnnouncementsAction, updateAnnouncementAction } from "@/app/actions/cms";
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
import { getReviewNotesAction, type ReviewNote } from "@/app/actions/review-notes";
import { CubaReviewNotesCard } from "@/components/review-notes/cuba-review-notes-card";

type AnnouncementEditDraft = DraftPayload & SEOFormValue & { title: string; body: string; start_at: string | null; end_at: string | null; media_asset_ids: string[] };
const blankDraft: AnnouncementEditDraft = { ...emptySEOValue(), title: "", body: "", start_at: null, end_at: null, media_asset_ids: [] };
const dateTimeValue = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

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

export default function AdminAnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ann, setAnn] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(""); const [seo, setSEO] = useState<SEOFormValue>(emptySEOValue()); const [body, setBody] = useState(""); const [startAt, setStartAt] = useState(""); const [endAt, setEndAt] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "versioning">("content");
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([]);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const [res, notesRes] = await Promise.all([
          getAdminAnnouncementsAction(),
          getReviewNotesAction("announcements", id),
        ]);
        if (!res.success) {
          setError(res.error || "Pengumuman belum dapat dimuat");
          return;
        }
        if (notesRes.success && notesRes.data) {
          setReviewNotes(notesRes.data);
        }

        const found = res.data?.find((a: any) => a.id === id);
		setRoles(res.roles || []);
        if (found) {
          const profileResult = await getDiscoverabilityProfileAction("announcement", id);
          if (!profileResult.success) { setError(profileResult.error || "SEO & Discovery belum dapat dimuat"); return; }
          const seoValue = profileToSEOValue(profileResult.data as DiscoverabilityProfile);
          setAnn({ ...found, seo_profile: seoValue });
          setTitle(found.title); setSEO(seoValue); setBody(found.body || ""); setStartAt(dateTimeValue(found.start_at)); setEndAt(dateTimeValue(found.end_at));
        } else {
          setError("Pengumuman tidak ditemukan");
        }
      } catch (e) {
        setError("Pengumuman belum dapat dimuat");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncement();
  }, [id]);

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");
  const canEdit = Boolean(ann && isEditor && ann.status === "draft");
  const canEditSEO = Boolean(ann && isEditor && ["draft", "published"].includes(ann.status));
  const value = useMemo<AnnouncementEditDraft>(() => ({ ...seo, title, body, start_at: startAt || null, end_at: endAt || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))] }), [body, endAt, seo, startAt, title]);
  const canonical = useMemo<AnnouncementEditDraft>(() => ann ? { ...(ann.seo_profile || emptySEOValue(ann.slug)), title: ann.title, body: ann.body || "", start_at: dateTimeValue(ann.start_at) || null, end_at: dateTimeValue(ann.end_at) || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(ann.body || "").map((usage) => usage.media_id))] } : blankDraft, [ann]);
  const applyDraft = (draft: AnnouncementEditDraft) => { setTitle(draft.title); setSEO(pickSEOValue(draft)); setBody(draft.body); setStartAt(draft.start_at ?? ""); setEndAt(draft.end_at ?? ""); };
  const autoSave = useAutoSaveDraft({ formKey: "announcement.edit", entityType: "announcement", entityId: id, baseEntityVersion: ann ? String(ann.version) : undefined, value, emptyValue: canonical, enabled: canEditSEO, onRecover: applyDraft, onStartNew: applyDraft });

  const handleTransition = async (status: string) => {
    setActionLoading(true);
    setError("");
    const res = await transitionAnnouncementAction(id, status);
    if (!res.success) {
      setError(res.error || "Status pengumuman belum dapat diperbarui");
      setActionLoading(false);
    } else {
      router.push("/dashboard/announcements");
    }
  };

  const handleSave = async () => {
    setActionLoading(true); setError("");
    const result = await updateAnnouncementAction(id, { title, slug: seo.slug, body, start_at: startAt ? new Date(startAt) : null, end_at: endAt ? new Date(endAt) : null, expected_version: ann.version, seo, media_usages: mediaUsagesFromMarkdown(body) });
    if (!result.success) { setError(result.error || "Pengumuman belum dapat diperbarui"); setActionLoading(false); return; }
    await autoSave.finalize(); router.push("/dashboard/announcements");
  };

  const handleSaveSEO = async () => {
    setActionLoading(true); setError(""); const result = await saveDiscoverabilityProfileAction("announcement", id, seo);
    if (!result.success) { setError(result.error || "SEO & Discovery belum dapat disimpan"); setActionLoading(false); return; }
    await autoSave.finalize(); router.refresh(); setActionLoading(false);
  };

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100" /><div className="mt-6 h-52 rounded-xl bg-slate-100" /></div>;
  if (!ann) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900">Pengumuman tidak tersedia</h1><p className="mt-3 text-sm text-slate-500">{error}</p><Link href="/dashboard/announcements" className="admin-button mt-6">Kembali</Link></div>;

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header"><div><Link href="/dashboard/announcements" className="text-sm font-bold text-sky-700 dark:text-sky-400">&larr; Kembali ke Pengumuman</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{ann.title}</h1><p className="admin-page-copy">Tinjau jadwal tayang, isi, dan status publikasi.</p></div><span className={`cuba-badge ${statusBadgeClasses[ann.status] || "cuba-badge-neutral"}`}>{statusLabels[ann.status] || ann.status}</span></div>
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
          module="announcements"
          articleId={id}
          onRollbackComplete={() => {
            router.refresh();
          }}
        />
      ) : (
        <>
          {canEdit && <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={false} />}
          <CubaReviewNotesCard
            entityType="announcements"
            entityId={id}
            contentTitle={title || ann.title}
            notes={reviewNotes}
            canAddNote={isEditor || isReviewer}
            onNoteAdded={(newNote) => setReviewNotes((prev) => [newNote, ...prev])}
            className="mb-6"
          />
          <section className="admin-form-card">
              <div className="admin-form-header flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black text-slate-900 dark:text-white">Alur publikasi</h2><p className="mt-1 text-xs text-slate-500">Aksi mengikuti status dan peran editorial.</p></div>
                <div className="flex flex-wrap gap-2">
                  
                  {ann.status === 'draft' && isEditor && (
                    <button 
                      onClick={() => handleTransition('in_review')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Ajukan peninjauan
                    </button>
                  )}

                  {ann.status === 'in_review' && isReviewer && (
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

                  {ann.status === 'approved' && isReviewer && (
                    <button 
                      onClick={() => handleTransition('published')} 
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Terbitkan
                    </button>
                  )}

                  {ann.status === 'published' && (isEditor || isReviewer) && (
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
                      <label className="admin-label" htmlFor="ann-title">Judul pengumuman</label>
                      <input id="ann-title" type="text" className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="admin-label" htmlFor="ann-start">Mulai tayang</label>
                        <input id="ann-start" type="datetime-local" className="admin-input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                      </div>
                      <div>
                        <label className="admin-label" htmlFor="ann-end">Selesai tayang</label>
                        <input id="ann-end" type="datetime-local" className="admin-input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="admin-label" htmlFor="ann-body">Konten pengumuman</label>
                      <CubaMarkdownEditor
                        id="ann-body"
                        value={body}
                        onChange={setBody}
                        rows={14}
                        placeholder="Tulis konten pengumuman dalam format Markdown…"
                        mediaPickerSlot={<MediaPicker onSelect={(selection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); }} buttonLabel="Sisipkan media" />}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-xs uppercase font-bold">Mulai</span>
                          <span className="text-slate-900 dark:text-white font-medium">{ann.start_at ? new Date(ann.start_at).toLocaleString("id-ID") : 'Segera'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-xs uppercase font-bold">Selesai</span>
                          <span className="text-slate-900 dark:text-white font-medium">{ann.end_at ? new Date(ann.end_at).toLocaleString("id-ID") : 'Tanpa batas'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="admin-label">Isi pengumuman</h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-5">
                        <AdminMarkdownRenderer content={ann.body} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {canEdit && <SeoDiscoverySection compact embedded value={seo} onChange={setSEO} contentTitle={title || ann.title} contentSummary={(body || ann.body || "").slice(0, 300)} contentBody={body || ann.body || ""} routePrefix="/announcements/" />}
              {canEdit && <div className="admin-form-footer"><button type="button" className="admin-button" disabled={actionLoading || !title || !seo.slug || !body} onClick={handleSave}>Simpan perubahan</button></div>}
          </section>
          {!canEdit && <SeoDiscoverySection compact value={seo} onChange={setSEO} contentTitle={title || ann.title} contentSummary={(body || ann.body || "").slice(0, 300)} contentBody={body || ann.body || ""} routePrefix="/announcements/" disabled={!canEditSEO} />}
          {!canEdit && canEditSEO && <div className="flex justify-end"><button type="button" className="admin-button" disabled={actionLoading} onClick={handleSaveSEO}>Simpan pengaturan publikasi</button></div>}
        </>
      )}
    </div>
  );
}
