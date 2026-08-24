"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionAnnouncementAction, getAdminAnnouncementsAction, updateAnnouncementAction } from "@/app/actions/cms";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import MediaPicker from "@/components/media/MediaPicker";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";

type AnnouncementEditDraft = DraftPayload & { title: string; slug: string; body: string; start_at: string | null; end_at: string | null; media_asset_ids: string[] };
const blankDraft: AnnouncementEditDraft = { title: "", slug: "", body: "", start_at: null, end_at: null, media_asset_ids: [] };
const dateTimeValue = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

export default function AdminAnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ann, setAnn] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState(""); const [body, setBody] = useState(""); const [startAt, setStartAt] = useState(""); const [endAt, setEndAt] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await getAdminAnnouncementsAction();
        if (!res.success) {
          setError(res.error || "Pengumuman belum dapat dimuat");
          return;
        }

        const found = res.data?.find((a: any) => a.id === id);
		setRoles(res.roles || []);
        if (found) {
          setAnn(found);
          setTitle(found.title); setSlug(found.slug); setBody(found.body || ""); setStartAt(dateTimeValue(found.start_at)); setEndAt(dateTimeValue(found.end_at));
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
  const value = useMemo<AnnouncementEditDraft>(() => ({ title, slug, body, start_at: startAt || null, end_at: endAt || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(body).map((usage) => usage.media_id))] }), [body, endAt, slug, startAt, title]);
  const canonical = useMemo<AnnouncementEditDraft>(() => ann ? { title: ann.title, slug: ann.slug, body: ann.body || "", start_at: dateTimeValue(ann.start_at) || null, end_at: dateTimeValue(ann.end_at) || null, media_asset_ids: [...new Set(mediaUsagesFromMarkdown(ann.body || "").map((usage) => usage.media_id))] } : blankDraft, [ann]);
  const applyDraft = (draft: AnnouncementEditDraft) => { setTitle(draft.title); setSlug(draft.slug); setBody(draft.body); setStartAt(draft.start_at ?? ""); setEndAt(draft.end_at ?? ""); };
  const autoSave = useAutoSaveDraft({ formKey: "announcement.edit", entityType: "announcement", entityId: id, baseEntityVersion: ann ? String(ann.version) : undefined, value, emptyValue: canonical, enabled: canEdit, onRecover: applyDraft, onStartNew: applyDraft });

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
    const result = await updateAnnouncementAction(id, { title, slug, body, start_at: startAt ? new Date(startAt) : null, end_at: endAt ? new Date(endAt) : null, expected_version: ann.version, media_usages: mediaUsagesFromMarkdown(body) });
    if (!result.success) { setError(result.error || "Pengumuman belum dapat diperbarui"); setActionLoading(false); return; }
    await autoSave.finalize(); router.push("/dashboard/announcements");
  };

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100" /><div className="mt-6 h-52 rounded-xl bg-slate-100" /></div>;
  if (!ann) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900">Pengumuman tidak tersedia</h1><p className="mt-3 text-sm text-slate-500">{error}</p><Link href="/dashboard/announcements" className="admin-button mt-6">Kembali</Link></div>;

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header"><div><Link href="/dashboard/announcements" className="text-sm font-bold text-sky-700">&larr; Kembali ke Pengumuman</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{ann.title}</h1><p className="admin-page-copy">Tinjau jadwal tayang, isi, dan status publikasi.</p></div><span className="admin-status bg-sky-50 text-sky-800">{ann.status}</span></div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
      {canEdit && <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={false} />}
      <section className="admin-form-card">
          <div className="admin-form-header flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black text-slate-900">Alur publikasi</h2><p className="mt-1 text-xs text-slate-500">Aksi mengikuti status dan peran editorial.</p></div>
            <div className="flex flex-wrap gap-2">
              
              {ann.status === 'draft' && isEditor && (
                <button 
                  onClick={() => handleTransition('in_review')} 
                  disabled={actionLoading}
                  className="admin-button"
                >
                  Ajukan review
                </button>
              )}

              {ann.status === 'in_review' && isReviewer && (
                <>
                  <button 
                    onClick={() => handleTransition('draft')} 
                    disabled={actionLoading}
                    className="admin-button-secondary !text-rose-700"
                  >
                    Kembalikan ke draft
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
            {canEdit ? <><div className="grid gap-6 md:grid-cols-2"><div><label htmlFor="announcement-edit-title" className="admin-label">Judul *</label><input id="announcement-edit-title" className="admin-input" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><label htmlFor="announcement-edit-slug" className="admin-label">Slug URL *</label><input id="announcement-edit-slug" className="admin-input" value={slug} onChange={(event) => setSlug(event.target.value)} /></div></div><div className="grid gap-6 md:grid-cols-2"><div><label htmlFor="announcement-edit-start" className="admin-label">Mulai tayang</label><input id="announcement-edit-start" type="datetime-local" className="admin-input" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div><div><label htmlFor="announcement-edit-end" className="admin-label">Selesai tayang</label><input id="announcement-edit-end" type="datetime-local" className="admin-input" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></div></div><div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="announcement-edit-body" className="admin-label !mb-0">Isi pengumuman *</label><MediaPicker onSelect={(selection: MediaSelection) => { setBody((current) => `${current}\n${mediaMarkdown(selection)}\n`); autoSave.requestImmediateSave(); }} buttonLabel="Sisipkan media" /></div><textarea id="announcement-edit-body" className="admin-input font-mono" rows={12} value={body} onChange={(event) => setBody(event.target.value)} /></div></> : <><div><h3 className="admin-label">Jadwal tayang</h3>
            <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold">Mulai</span>
                <span className="text-slate-800">{ann.start_at ? new Date(ann.start_at).toLocaleString("id-ID") : 'Secepatnya'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-bold">Selesai</span>
                <span className="text-slate-800">{ann.end_at ? new Date(ann.end_at).toLocaleString("id-ID") : 'Tanpa batas'}</span>
              </div>
            </div></div>
            <div><h3 className="admin-label">Isi pengumuman</h3><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-600 whitespace-pre-wrap">{ann.body}</div></div>
            </>}
          </div>
          {canEdit && <div className="admin-form-footer"><button type="button" className="admin-button" disabled={actionLoading || !title || !slug || !body} onClick={handleSave}>Simpan perubahan kanonis</button></div>}
      </section>
    </div>
  );
}
