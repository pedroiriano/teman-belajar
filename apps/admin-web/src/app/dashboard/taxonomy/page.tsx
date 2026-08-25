"use client";

import { useCallback, useEffect, useState } from "react";
import { archiveTaxonomyTermAction, createTaxonomyTermAction, getTaxonomyAction } from "@/app/actions/discoverability";
import { AdminIcon } from "@/components/admin-icon";
import type { TaxonomyTerm } from "@/components/seo/types";

type Kind = "categories" | "tags";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function TaxonomyPage() {
  const [categories, setCategories] = useState<TaxonomyTerm[]>([]);
  const [tags, setTags] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); const result = await getTaxonomyAction(true);
    if (!result.success) setError(result.error || "Taxonomy belum dapat dimuat");
    else { setCategories(result.data.categories); setTags(result.data.tags); setError(""); }
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    void getTaxonomyAction(true).then((result) => {
      if (!active) return;
      if (!result.success) setError(result.error || "Taxonomy belum dapat dimuat");
      else { setCategories(result.data.categories); setTags(result.data.tags); setError(""); }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const create = async (kind: Kind, form: HTMLFormElement) => {
    const data = new FormData(form); const name = String(data.get("name") || "").trim(); const description = String(data.get("description") || "").trim();
    if (!name) return; setBusy(kind); setError("");
    const result = await createTaxonomyTermAction(kind, { name, slug: slugify(name), description });
    if (!result.success) setError(result.error || "Term belum dapat dibuat"); else { form.reset(); await load(); }
    setBusy("");
  };
  const archive = async (kind: Kind, term: TaxonomyTerm) => {
    if (!window.confirm(`Arsipkan ${term.name}? Relasi historis tetap dipertahankan.`)) return;
    setBusy(term.id); const result = await archiveTaxonomyTermAction(kind, term.id);
    if (!result.success) setError(result.error || "Term belum dapat diarsipkan"); else await load(); setBusy("");
  };

  return <div className="admin-page">
    <div className="admin-page-header"><div><p className="admin-kicker">Controlled vocabulary</p><h1 className="admin-page-title">Taxonomy &amp; SEO Governance</h1><p className="admin-page-copy">Category adalah klasifikasi editorial tunggal; Tag adalah vocabulary flat dan reusable. Perbedaan kapitalisasi ditolak sebagai duplikat.</p></div><span className="admin-status bg-sky-50 text-sky-800">TASK-011D</span></div>
    {error && <div className="admin-alert-error" role="alert">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-2">
      <TermPanel kind="categories" title="Category" copy="Klasifikasi editorial terkontrol untuk pengelompokan utama." terms={categories} loading={loading} busy={busy} onCreate={create} onArchive={archive} />
      <TermPanel kind="tags" title="Tag" copy="Vocabulary flat many-to-many untuk filter, internal linking, dan discovery—bukan meta keywords." terms={tags} loading={loading} busy={busy} onCreate={create} onArchive={archive} />
    </div>
  </div>;
}

function TermPanel({ kind, title, copy, terms, loading, busy, onCreate, onArchive }: { kind: Kind; title: string; copy: string; terms: TaxonomyTerm[]; loading: boolean; busy: string; onCreate: (kind: Kind, form: HTMLFormElement) => Promise<void>; onArchive: (kind: Kind, term: TaxonomyTerm) => Promise<void> }) {
  return <section className="admin-form-card">
    <div className="admin-form-header"><div className="flex gap-3"><span className="admin-stat-icon"><AdminIcon name="folder" className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div></div></div>
    <form className="admin-form-body" onSubmit={(event) => { event.preventDefault(); void onCreate(kind, event.currentTarget); }}><div><label className="admin-label" htmlFor={`${kind}-name`}>Nama *</label><input id={`${kind}-name`} name="name" className="admin-input" required maxLength={120} /></div><div><label className="admin-label" htmlFor={`${kind}-description`}>Deskripsi</label><textarea id={`${kind}-description`} name="description" className="admin-input" rows={2} maxLength={1000} /></div><button className="admin-button w-fit" disabled={busy === kind}>{busy === kind ? "Menyimpan…" : `Tambah ${title}`}</button></form>
    <div className="border-t border-slate-200 p-5 sm:p-6">{loading ? <p className="text-sm text-slate-500">Memuat vocabulary…</p> : terms.length === 0 ? <p className="text-sm text-slate-500">Belum ada {title}.</p> : <ul className="space-y-3">{terms.map((term) => <li key={term.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-black text-slate-900">{term.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${term.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{term.status}</span></div><p className="mt-1 text-xs text-slate-500">/{term.slug} · {term.usage_count} penggunaan</p></div>{term.status === "active" && <button type="button" className="admin-button-secondary" disabled={busy === term.id} onClick={() => void onArchive(kind, term)}>Arsipkan</button>}</li>)}</ul>}</div>
  </section>;
}
