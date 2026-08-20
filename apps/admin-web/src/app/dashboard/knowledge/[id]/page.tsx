"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { transitionKnowledgeAction, getAdminKnowledgeDetailAction, createKnowledgeRevisionAction } from "@/app/actions/knowledge";

export default function AdminKnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await getAdminKnowledgeDetailAction(id);
        if (!res.success) {
          setError(res.error || "Artikel pengetahuan belum dapat dimuat");
          return;
        }
        
		setArticle(res.data);
		setBody(res.data?.body || "");
		setRoles(res.roles || []);
      } catch (e) {
        setError("Artikel pengetahuan belum dapat dimuat");
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [id]);

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

  const handleSaveRevision = async () => {
    setActionLoading(true);
    setError("");
    const res = await createKnowledgeRevisionAction(id, { body });
    if (!res.success) {
      setError(res.error || "Revisi baru belum dapat disimpan");
      setActionLoading(false);
    } else {
      router.push("/dashboard/knowledge");
    }
  };

  if (loading) return <div className="admin-card animate-pulse p-8"><div className="h-7 w-72 rounded bg-slate-100" /><div className="mt-6 h-72 rounded-xl bg-slate-100" /></div>;
  if (!article) return <div className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><h1 className="text-xl font-black text-slate-900">Artikel tidak tersedia</h1><p className="mt-3 text-sm text-slate-500">{error}</p><Link href="/dashboard/knowledge" className="admin-button mt-6">Kembali</Link></div>;

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");
  const canCreateRevision = isEditor && ["draft", "published"].includes(article.status);

  return (
    <div className="admin-page max-w-5xl">
      <div className="admin-page-header"><div><Link href="/dashboard/knowledge" className="text-sm font-bold text-sky-700">&larr; Kembali ke Pengetahuan</Link><p className="admin-kicker mt-5">Detail editorial</p><h1 className="admin-page-title">{article.title}</h1><p className="admin-page-copy">Kelola revisi serta transisi review dan publikasi.</p></div><span className="admin-status bg-sky-50 text-sky-800">{article.status}</span></div>
      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
      <section className="admin-form-card">
          <div className="admin-form-header flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black text-slate-900">Alur publikasi</h2><p className="mt-1 text-xs text-slate-500">Aksi mengikuti status dan peran editorial.</p></div>
            <div className="flex flex-wrap gap-2">
              
              {article.status === 'draft' && isEditor && (
                <button 
                  onClick={() => handleTransition('in_review')} 
                  disabled={actionLoading}
                  className="admin-button"
                >
                  Ajukan review
                </button>
              )}

              {article.status === 'in_review' && isReviewer && (
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
            <div><h3 className="admin-label">Ringkasan</h3><p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{article.summary || "Belum ada ringkasan."}</p></div>
            <div><h3 className="admin-label">Isi artikel saat ini</h3>
            
            {!canCreateRevision ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                {article.body}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="admin-input font-mono text-sm"
                  rows={15}
                  aria-label="Isi revisi artikel"
                />
                
                {article.body !== body && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveRevision}
                      disabled={actionLoading}
                      className="admin-button"
                    >
                      Simpan sebagai revisi draft baru
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
      </section>
    </div>
  );
}
