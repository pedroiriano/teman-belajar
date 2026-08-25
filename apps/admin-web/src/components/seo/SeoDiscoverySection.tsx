"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { getTaxonomyAction } from "@/app/actions/discoverability";
import { AdminIcon } from "@/components/admin-icon";
import MediaPicker from "@/components/media/MediaPicker";
import type { MediaSelection } from "@/components/media/types";
import type { SEOFormValue, TaxonomyTerm } from "./types";

type Props = {
  value: SEOFormValue;
  onChange: (value: SEOFormValue) => void;
  contentTitle: string;
  contentSummary: string;
  contentBody?: string;
  routePrefix: "/news/" | "/announcements/" | "/knowledge/";
  disabled?: boolean;
};

type Check = { code: string; status: "BLOCKER" | "WARNING" | "PASS"; message: string };

export function SeoDiscoverySection({ value, onChange, contentTitle, contentSummary, contentBody = "", routePrefix, disabled = false }: Props) {
  const id = useId();
  const [categories, setCategories] = useState<TaxonomyTerm[]>([]);
  const [tags, setTags] = useState<TaxonomyTerm[]>([]);
  const [taxonomyError, setTaxonomyError] = useState("");
  const [selectedMediaName, setSelectedMediaName] = useState("");

  useEffect(() => {
    let active = true;
    void getTaxonomyAction().then((result) => {
      if (!active) return;
      if (!result.success) { setTaxonomyError(result.error || "Taxonomy belum dapat dimuat"); return; }
      setCategories(result.data.categories); setTags(result.data.tags); setTaxonomyError("");
    });
    return () => { active = false; };
  }, []);

  const set = <K extends keyof SEOFormValue>(key: K, next: SEOFormValue[K]) => onChange({ ...value, [key]: next });
  const toggleTag = (tagId: string) => set("tag_ids", value.tag_ids.includes(tagId) ? value.tag_ids.filter((item) => item !== tagId) : [...value.tag_ids, tagId]);
  const effectiveTitle = value.seo_title.trim() || contentTitle.trim() || "Judul konten";
  const effectiveDescription = value.meta_description.trim() || contentSummary.trim() || "Ringkasan konten akan tampil di sini.";
  const canonical = value.canonical_path?.trim() || `${routePrefix}${value.slug || "slug-konten"}`;
  const socialTitle = value.social_title.trim() || effectiveTitle;
  const socialDescription = value.social_description.trim() || effectiveDescription;
  const hasHeading = /^#\s+.+/m.test(contentBody) || Boolean(contentTitle.trim());
  const hasInternalLink = /\[[^\]]+\]\(\/(?!\/)[^)]+\)/m.test(contentBody);

  const checks = useMemo<Check[]>(() => [
    { code: "title", status: effectiveTitle === "Judul konten" ? "BLOCKER" : "PASS", message: effectiveTitle === "Judul konten" ? "Judul utama wajib tersedia." : "Judul SEO memiliki fallback konten." },
    { code: "description", status: effectiveDescription.startsWith("Ringkasan konten") ? "WARNING" : "PASS", message: effectiveDescription.startsWith("Ringkasan konten") ? "Tambahkan ringkasan atau meta description." : "Deskripsi pencarian tersedia." },
    { code: "slug", status: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ? "PASS" : "BLOCKER", message: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ? "Slug URL aman." : "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung tunggal." },
    { code: "category", status: value.category_id ? "PASS" : "WARNING", message: value.category_id ? "Kategori editorial dipilih." : "Pilih satu kategori editorial." },
    { code: "social_image", status: value.social_media_id ? "PASS" : "WARNING", message: value.social_media_id ? "Gambar sosial menggunakan Media Asset ID." : "Gambar unggulan/situs akan digunakan sebagai fallback." },
    { code: "social_image_alt", status: value.social_media_id && !value.social_image_alt ? "WARNING" : "PASS", message: value.social_media_id && !value.social_image_alt ? "Lengkapi teks alternatif kanonis aset melalui Media Library." : "Fallback atau gambar sosial memiliki teks alternatif." },
    { code: "h1", status: hasHeading ? "PASS" : "WARNING", message: hasHeading ? "Judul/H1 konten tersedia." : "Pastikan konten memiliki satu judul utama." },
    { code: "internal_links", status: hasInternalLink ? "PASS" : "WARNING", message: hasInternalLink ? "Konten memiliki tautan internal terkait." : "Pertimbangkan tautan internal ke materi relevan." },
    { code: "indexability", status: value.indexable === "true" ? "PASS" : "WARNING", message: value.indexable === "true" ? "Akan indexable hanya setelah konten diterbitkan." : "Konten secara eksplisit noindex." },
  ], [effectiveDescription, effectiveTitle, hasHeading, hasInternalLink, value.category_id, value.indexable, value.slug, value.social_image_alt, value.social_media_id]);

  const mediaSelected = (media: MediaSelection) => { onChange({ ...value, social_media_id: media.id, social_image_alt: media.alt_text || "" }); setSelectedMediaName(media.display_filename || media.original_filename || media.id); };

  return <section className="admin-form-card" aria-labelledby={`${id}-title`}>
    <div className="admin-form-header"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="search" className="h-5 w-5" /></span><div><p className="admin-kicker">Discoverability</p><h2 id={`${id}-title`} className="font-black text-slate-900">SEO &amp; Discovery</h2><p className="mt-1 text-xs text-slate-500">Metadata server-rendered, taxonomy terkontrol, dan pratinjau publik.</p></div></div></div>
    <div className="admin-form-body">
      {taxonomyError && <div className="admin-alert-error" role="alert">{taxonomyError}</div>}
      <div className="grid gap-6 md:grid-cols-2">
        <div><label htmlFor={`${id}-slug`} className="admin-label">Slug URL *</label><input id={`${id}-slug`} className="admin-input" value={value.slug} disabled={disabled} maxLength={120} onChange={(event) => set("slug", event.target.value)} aria-describedby={`${id}-slug-help`} /><p id={`${id}-slug-help`} className="mt-2 text-xs text-slate-500">Perubahan pada konten terbit membuat redirect permanen 308 dari URL lama.</p></div>
        <div><label htmlFor={`${id}-category`} className="admin-label">Kategori</label><select id={`${id}-category`} className="admin-input" disabled={disabled} value={value.category_id || ""} onChange={(event) => set("category_id", event.target.value || null)}><option value="">Belum dipilih</option>{categories.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></div>
      </div>
      <fieldset disabled={disabled}><legend className="admin-label">Tag terkontrol</legend>{tags.length ? <div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition ${value.tag_ids.includes(tag.id) ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600"}`}><input className="sr-only" type="checkbox" checked={value.tag_ids.includes(tag.id)} onChange={() => toggleTag(tag.id)} />{tag.name}</label>)}</div> : <p className="text-sm text-slate-500">Belum ada Tag aktif. Kelola vocabulary melalui menu Taxonomy.</p>}</fieldset>
      <div className="grid gap-6 md:grid-cols-2"><div><label htmlFor={`${id}-seo-title`} className="admin-label">SEO title</label><input id={`${id}-seo-title`} className="admin-input" value={value.seo_title} disabled={disabled} maxLength={200} onChange={(event) => set("seo_title", event.target.value)} placeholder={contentTitle || "Fallback ke judul konten"} /></div><div><label htmlFor={`${id}-description`} className="admin-label">Meta description</label><textarea id={`${id}-description`} className="admin-input" rows={3} value={value.meta_description} disabled={disabled} maxLength={500} onChange={(event) => set("meta_description", event.target.value)} placeholder={contentSummary || "Fallback ke ringkasan konten"} /></div></div>
      <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Pratinjau pencarian"><p className="admin-kicker">Search preview</p><p className="mt-3 text-lg font-bold text-sky-800">{effectiveTitle}</p><p className="mt-1 truncate text-xs text-emerald-700">teman-belajar.local{canonical}</p><p className="mt-2 text-sm leading-6 text-slate-600">{effectiveDescription}</p></section><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Pratinjau sosial"><div className="flex aspect-[2/1] items-center justify-center bg-sky-50 text-sm font-bold text-sky-700">{value.social_media_id ? selectedMediaName || "Media sosial terpilih" : "Gambar sosial belum dipilih"}</div><div className="p-5"><p className="font-black text-slate-900">{socialTitle}</p><p className="mt-2 text-sm text-slate-600">{socialDescription}</p></div></section></div>
      <div className="flex flex-wrap items-center gap-3"><MediaPicker imageOnly onSelect={mediaSelected} buttonLabel={value.social_media_id ? "Ganti gambar sosial" : "Pilih gambar sosial"} />{value.social_media_id && <><span className="max-w-xs truncate text-xs text-slate-500">{selectedMediaName || value.social_media_id}</span><button type="button" className="admin-button-secondary" disabled={disabled} onClick={() => { onChange({ ...value, social_media_id: null, social_image_alt: "" }); setSelectedMediaName(""); }}>Hapus pilihan</button></>}</div>
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><summary className="cursor-pointer font-black text-slate-900">Advanced SEO</summary><div className="mt-5 grid gap-5"><div className="grid gap-5 md:grid-cols-2"><div><label htmlFor={`${id}-social-title`} className="admin-label">Social title</label><input id={`${id}-social-title`} className="admin-input" disabled={disabled} value={value.social_title} maxLength={200} onChange={(event) => set("social_title", event.target.value)} /></div><div><label htmlFor={`${id}-social-description`} className="admin-label">Social description</label><textarea id={`${id}-social-description`} className="admin-input" disabled={disabled} rows={2} value={value.social_description} maxLength={500} onChange={(event) => set("social_description", event.target.value)} /></div></div><div><label htmlFor={`${id}-canonical`} className="admin-label">Canonical path internal (opsional)</label><input id={`${id}-canonical`} className="admin-input" disabled={disabled} value={value.canonical_path || ""} onChange={(event) => set("canonical_path", event.target.value || null)} placeholder={`${routePrefix}${value.slug || "slug-konten"}`} /><p className="mt-2 text-xs text-slate-500">Hanya path internal sesuai tipe konten; URL eksternal dan query ditolak server.</p></div><label className="flex items-start gap-3 text-sm font-bold text-slate-700"><input type="checkbox" className="mt-1" checked={value.indexable === "true"} disabled={disabled} onChange={(event) => set("indexable", String(event.target.checked))} /><span>Izinkan pengindeksan setelah konten berstatus published dan memenuhi kebijakan publik.</span></label></div></details>
      <section aria-labelledby={`${id}-health`}><h3 id={`${id}-health`} className="font-black text-slate-900">SEO Health Assistant</h3><p className="mt-1 text-xs text-slate-500">Checklist editorial, bukan skor atau janji peringkat mesin pencari.</p><ul className="mt-4 grid gap-3 sm:grid-cols-2">{checks.map((check) => <li key={check.code} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className={`h-fit rounded-full px-2 py-1 text-[10px] font-black ${check.status === "PASS" ? "bg-emerald-50 text-emerald-700" : check.status === "BLOCKER" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-800"}`}>{check.status}</span><span className="text-xs leading-5 text-slate-600">{check.message}</span></li>)}</ul></section>
    </div>
  </section>;
}
