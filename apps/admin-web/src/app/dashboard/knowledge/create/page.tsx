"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createKnowledgeAction } from "@/app/actions/knowledge";
import { AdminIcon } from "@/components/admin-icon";

import MediaPicker from "@/components/media/MediaPicker";
import { mediaMarkdown, mediaUsagesFromMarkdown } from "@/components/media/insertion";
import type { MediaSelection } from "@/components/media/types";

export default function CreateKnowledgePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const insertMedia = (selection: MediaSelection) => {
    setBody((prev) => `${prev}\n${mediaMarkdown(selection)}\n`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createKnowledgeAction({ title, slug, summary, body, media_usages: mediaUsagesFromMarkdown(body) });

      if (!res.success) {
        throw new Error(res.error || "Artikel pengetahuan belum dapat dibuat");
      }

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
      <form onSubmit={handleSubmit} className="admin-form-card">
        <div className="admin-form-header"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="knowledge" className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Informasi artikel</h2><p className="mt-1 text-xs text-slate-500">Judul dan ringkasan membantu artikel mudah ditemukan.</p></div></div></div>
        <div className="admin-form-body">
            {error && (
              <div className="admin-alert-error" role="alert">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <div className="space-y-2">
                <label htmlFor="knowledge-slug" className="admin-label">Slug URL <span className="text-rose-600">*</span></label>
                <input 
                  id="knowledge-slug"
                  type="text" 
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="admin-input"
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
        <div className="admin-form-footer"><Link href="/dashboard/knowledge" className="admin-button-secondary">Batal</Link><button type="submit" disabled={loading} className="admin-button">{loading ? "Menyimpan…" : "Simpan draft"}</button></div>
      </form>
    </div>
  );
}

