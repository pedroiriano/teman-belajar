"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createNewsAction } from "@/app/actions/cms";
import { AdminIcon } from "@/components/admin-icon";
import MediaPicker from "@/components/media/MediaPicker";

export default function CreateNewsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTitleChange = (value: string) => { setTitle(value); setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")); };
  const insertMedia = (mediaId: string) => setBody((current) => `${current}\n![Media](/api/v1/media/${mediaId}/content)\n`);
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(""); try { const result = await createNewsAction({ title, slug, excerpt, body }); if (!result.success) throw new Error(result.error || "Berita belum dapat disimpan"); router.push("/dashboard/news"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Terjadi kesalahan yang tidak terduga"); } finally { setLoading(false); } };

  return <div className="admin-page max-w-5xl">
    <div className="admin-page-header"><div><Link href="/dashboard/news" className="inline-flex items-center text-sm font-bold text-orange-700">← Kembali ke Berita</Link><p className="admin-kicker mt-5">Editor berita</p><h1 className="admin-page-title">Buat berita baru</h1><p className="admin-page-copy">Berita disimpan sebagai draft sebelum masuk proses review.</p></div><span className="admin-status bg-slate-100 text-slate-600">Status: Draft</span></div>
    <form onSubmit={handleSubmit} className="admin-form-card">
      <div className="admin-form-header"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="news" className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Informasi berita</h2><p className="mt-1 text-xs text-slate-500">Lengkapi judul, ringkasan, dan isi publikasi.</p></div></div></div>
      <div className="admin-form-body">{error && <div className="admin-alert-error" role="alert">{error}</div>}<div className="grid gap-6 md:grid-cols-2"><div><label htmlFor="news-title" className="admin-label">Judul <span className="text-rose-600">*</span></label><input id="news-title" required value={title} onChange={(event) => handleTitleChange(event.target.value)} className="admin-input" placeholder="Contoh: Program Pembelajaran Kuartal Ketiga" /></div><div><label htmlFor="news-slug" className="admin-label">Slug URL <span className="text-rose-600">*</span></label><input id="news-slug" required value={slug} onChange={(event) => setSlug(event.target.value)} className="admin-input !bg-slate-50" aria-describedby="news-slug-help" /><p id="news-slug-help" className="mt-2 text-xs text-slate-500">Gunakan huruf kecil, angka, dan tanda hubung.</p></div></div><div><label htmlFor="news-excerpt" className="admin-label">Ringkasan</label><textarea id="news-excerpt" rows={3} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} className="admin-input" placeholder="Ringkasan singkat yang tampil pada kartu berita." /></div><div><div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label htmlFor="news-body" className="admin-label !mb-0">Isi berita <span className="text-rose-600">*</span></label><MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan media" /></div><textarea id="news-body" required rows={14} value={body} onChange={(event) => setBody(event.target.value)} className="admin-input font-mono" placeholder="Tulis isi berita dalam Markdown yang terstruktur…" /></div></div>
      <div className="admin-form-footer"><Link href="/dashboard/news" className="admin-button-secondary">Batal</Link><button type="submit" disabled={loading} className="admin-button">{loading ? "Menyimpan…" : "Simpan draft"}</button></div>
    </form>
  </div>;
}
