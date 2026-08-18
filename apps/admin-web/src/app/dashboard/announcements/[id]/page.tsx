"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionAnnouncementAction, getAdminAnnouncementsAction } from "@/app/actions/cms";

export default function AdminAnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ann, setAnn] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

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

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100" /><div className="mt-6 h-52 rounded-xl bg-slate-100" /></div>;
  if (!ann) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900">Pengumuman tidak tersedia</h1><p className="mt-3 text-sm text-slate-500">{error}</p><Link href="/dashboard/announcements" className="admin-button mt-6">Kembali</Link></div>;

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header"><div><Link href="/dashboard/announcements" className="text-sm font-bold text-orange-700">&larr; Kembali ke Pengumuman</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{ann.title}</h1><p className="admin-page-copy">Tinjau jadwal tayang, isi, dan status publikasi.</p></div><span className="admin-status bg-orange-50 text-orange-800">{ann.status}</span></div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
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
            <div><h3 className="admin-label">Jadwal tayang</h3>
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
          </div>
      </section>
    </div>
  );
}
