"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  archiveFAQCategoryAction,
  createFAQAction,
  createFAQCategoryAction,
  getFAQWorkspaceAction,
  transitionFAQAction,
  updateFAQAction,
  type FAQCategory,
  type FAQInput,
  type FAQItem,
} from "@/app/actions/faq";
import { AdminIcon } from "@/components/admin-icon";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import MediaPicker from "@/components/media/MediaPicker";
import type { MediaSelection } from "@/components/media/types";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
type StatusFilter = "all" | FAQItem["status"];

export default function FAQWorkspacePage() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [items, setItems] = useState<FAQItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<FAQItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    const result = await getFAQWorkspaceAction();
    if (!result.success) { setError(result.error); setLoading(false); return; }
    setCategories(result.categories); setItems(result.items); setRoles(result.roles); setError(""); setLoading(false);
    if (selectId) setSelected(result.items.find((item) => item.id === selectId) || null);
    else setSelected((current) => current ? result.items.find((item) => item.id === current.id) || null : null);
  }, []);

  useEffect(() => {
    let active = true;
    void getFAQWorkspaceAction().then((result) => {
      if (!active) return;
      if (!result.success) { setError(result.error); setLoading(false); return; }
      setCategories(result.categories); setItems(result.items); setRoles(result.roles); setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const canWrite = roles.some((role) => ["Portal Administrator", "Content Editor"].includes(role));
  const filtered = useMemo(() => items.filter((item) => status === "all" || item.status === status).filter((item) => !category || item.category_id === category).filter((item) => { const q=query.trim().toLowerCase(); return !q || [item.question,item.answer,item.slug,item.category_name].some((value)=>value.toLowerCase().includes(q)); }), [category,items,query,status]);
  const activeCategories = categories.filter((item) => item.status === "active");

  const beginCreate = () => { setSelected(null); setCreating(true); setError(""); setNotice(""); };
  const choose = (item: FAQItem) => { setSelected(item); setCreating(false); setError(""); setNotice(""); };

  return <div className="admin-page">
    <header className="admin-page-header">
      <div className="max-w-3xl"><p className="admin-kicker">Help Center</p><h1 className="admin-page-title">FAQ</h1><p className="admin-page-copy">Kelola jawaban singkat dengan workflow editorial yang sama ketatnya seperti konten lain.</p></div>
      <div className="flex flex-wrap gap-3">{canWrite && <button type="button" className="admin-button-secondary" onClick={() => setShowCategories((value) => !value)} aria-expanded={showCategories}>Kelola kategori</button>}{canWrite && <button type="button" className="admin-button" onClick={beginCreate}>+ Buat FAQ</button>}</div>
    </header>
    {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
    {notice && <div className="admin-alert-success mb-5" role="status">{notice}</div>}
    {showCategories && <CategoryManager categories={categories} onChanged={async (message) => { setNotice(message); await load(); }} onError={setError} />}
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
      <section className="admin-form-card h-fit" aria-labelledby="faq-list-title">
        <div className="admin-form-header"><div><h2 id="faq-list-title" className="font-black text-slate-900">Daftar FAQ</h2><p className="mt-1 text-xs text-slate-500">{items.length} item di seluruh workflow</p></div></div>
        <div className="admin-form-body !gap-4">
          <div><label htmlFor="faq-search" className="sr-only">Cari FAQ</label><input id="faq-search" type="search" className="admin-input" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Cari pertanyaan atau jawaban…" /></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div><label className="sr-only" htmlFor="faq-status">Status</label><select id="faq-status" className="admin-input" value={status} onChange={(event)=>setStatus(event.target.value as StatusFilter)}><option value="all">Semua status</option><option value="draft">Draft</option><option value="in_review">Dalam review</option><option value="approved">Disetujui</option><option value="published">Terbit</option><option value="archived">Arsip</option></select></div><div><label className="sr-only" htmlFor="faq-category-filter">Kategori</label><select id="faq-category-filter" className="admin-input" value={category} onChange={(event)=>setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
          {loading ? <div className="admin-empty" role="status">Memuat FAQ…</div> : filtered.length === 0 ? <div className="admin-empty rounded-xl border border-slate-200">Belum ada FAQ yang sesuai.</div> : <ul className="grid gap-3">{filtered.map((item)=><li key={item.id}><button type="button" onClick={()=>choose(item)} className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-sky-400" data-selected={selected?.id===item.id}><div className="flex items-start justify-between gap-3"><span className="font-black text-slate-900">{item.question}</span><span className="admin-status admin-status-neutral shrink-0">{{ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan' }[item.status] || item.status.replace('_', ' ')}</span></div><p className="mt-2 text-xs text-slate-500">{item.category_name} · /{item.slug}</p></button></li>)}</ul>}
        </div>
      </section>
      <section>{creating || selected ? <FAQEditor key={selected?.id || "create"} item={selected} categories={activeCategories} canWrite={canWrite} roles={roles} onSaved={async (id,message)=>{setNotice(message);setCreating(false);await load(id);}} onChanged={async (message)=>{setNotice(message);await load(selected?.id);}} onError={setError} onCancel={()=>{setCreating(false);setSelected(null);}} /> : <div className="admin-empty rounded-2xl border border-slate-200 bg-white"><span className="admin-stat-icon mx-auto"><AdminIcon name="folder" className="h-5 w-5"/></span><h2 className="mt-4 text-xl font-black text-slate-900">Pilih FAQ untuk melihat detail</h2><p className="mt-2">Atau buat FAQ baru untuk memulai workflow editorial.</p></div>}</section>
    </div>
  </div>;
}

function CategoryManager({ categories, onChanged, onError }: { categories: FAQCategory[]; onChanged: (message:string)=>Promise<void>; onError:(message:string)=>void }) {
  const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [busy,setBusy]=useState(false); const slug=slugify(name);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);const result=await createFAQCategoryAction({name:name.trim(),slug,description:description.trim(),sort_order:categories.length*10+10});setBusy(false);if(!result.success){onError(result.error||"Kategori belum dapat dibuat");return;}setName("");setDescription("");await onChanged("Kategori FAQ berhasil dibuat.");};
  return <section className="admin-form-card mb-6"><div className="admin-form-header"><div><h2 className="font-black text-slate-900">Kategori FAQ</h2><p className="mt-1 text-xs text-slate-500">Arsip hanya diizinkan bila tidak memiliki FAQ aktif.</p></div></div><div className="admin-form-body"><form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1.5fr_auto]"><div><label htmlFor="faq-category-name" className="admin-label">Nama kategori *</label><input id="faq-category-name" required maxLength={120} className="admin-input" value={name} onChange={(event)=>setName(event.target.value)} placeholder="Contoh: Akun dan akses"/><p className="mt-2 text-xs text-slate-500">Slug: {slug||"dibuat-otomatis"}</p></div><div><label htmlFor="faq-category-description" className="admin-label">Deskripsi</label><input id="faq-category-description" maxLength={500} className="admin-input" value={description} onChange={(event)=>setDescription(event.target.value)} /></div><button className="admin-button self-end" disabled={busy||!slug}>{busy?"Menyimpan…":"Tambah kategori"}</button></form><ul className="grid gap-3 md:grid-cols-2">{categories.map((item)=><li key={item.id} className="admin-taxonomy-row"><div><p className="font-black text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">/{item.slug} · {item.status}</p></div>{item.status==="active"&&<button type="button" className="admin-button-secondary" onClick={async()=>{if(!window.confirm(`Arsipkan kategori “${item.name}”?`))return;const result=await archiveFAQCategoryAction(item.id);if(!result.success)onError(result.error||"Kategori belum dapat diarsipkan");else await onChanged("Kategori FAQ berhasil diarsipkan.");}}>Arsipkan</button>}</li>)}</ul></div></section>;
}

type FAQDraft = DraftPayload & { category_id:string|null;slug:string;question:string;answer:string;sort_order:string;media_asset_id:string|null;media_alt:string|null;seo_title:string;meta_description:string;indexable:string };

function FAQEditor({ item, categories, canWrite, roles, onSaved, onChanged, onError, onCancel }: { item:FAQItem|null;categories:FAQCategory[];canWrite:boolean;roles:string[];onSaved:(id:string,message:string)=>Promise<void>;onChanged:(message:string)=>Promise<void>;onError:(message:string)=>void;onCancel:()=>void }) {
  const initial=useMemo<FAQDraft>(()=>({category_id:item?.category_id||categories[0]?.id||null,slug:item?.slug||"",question:item?.question||"",answer:item?.answer||"",sort_order:String(item?.sort_order??10),media_asset_id:item?.media_asset_id||null,media_alt:item?.media_alt||null,seo_title:item?.seo_title||"",meta_description:item?.meta_description||"",indexable:String(item?.indexable??true)}),[categories,item]);
  const [value,setValue]=useState(initial); const [busy,setBusy]=useState(false); const editable=canWrite&&(!item||item.status==="draft");
  const apply=(draft:FAQDraft)=>setValue(draft);
  const autoSave=useAutoSaveDraft({formKey:item?"faq.edit":"faq.create",entityType:"faq_item",entityId:item?.id,baseEntityVersion:item?String(item.version):undefined,value,emptyValue:initial,enabled:editable,onRecover:apply,onStartNew:apply});
  const set=<K extends keyof FAQDraft>(key:K,next:FAQDraft[K])=>setValue((current)=>({...current,[key]:next}));
  const selectMedia=(media:MediaSelection)=>{setValue((current)=>({...current,media_asset_id:media.id,media_alt:media.insertion_alt_text||media.alt_text||null}));autoSave.requestImmediateSave();};
  const input=():FAQInput=>({category_id:value.category_id||"",slug:value.slug,question:value.question,answer:value.answer,sort_order:Number.parseInt(value.sort_order,10)||0,media_asset_id:value.media_asset_id,media_alt:value.media_asset_id?value.media_alt:null,seo_title:value.seo_title,meta_description:value.meta_description,indexable:value.indexable==="true",expected_version:item?.version});
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);const result=item?await updateFAQAction(item.id,input()):await createFAQAction(input());setBusy(false);if(!result.success){onError(result.error||"FAQ belum dapat disimpan");return;}await autoSave.finalize();await onSaved(result.data!.id,item?"FAQ berhasil diperbarui.":"FAQ draft berhasil dibuat.");};
  const reviewer=roles.some((role)=>["Portal Administrator","Reviewer"].includes(role));
  const nextActions:itemAction[]=[]; if(item?.status==="draft"&&canWrite)nextActions.push({status:"in_review",label:"Ajukan review"});if(item?.status==="in_review"&&reviewer)nextActions.push({status:"draft",label:"Kembalikan ke draft"},{status:"approved",label:"Setujui"});if(item?.status==="approved"&&reviewer)nextActions.push({status:"draft",label:"Kembalikan ke draft"},{status:"published",label:"Terbitkan"});if(item?.status==="published"&&(canWrite||reviewer))nextActions.push({status:"archived",label:"Arsipkan"});
  return <div className="grid gap-5">{editable&&<DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow}/>}<form onSubmit={submit} className="admin-form-card"><div className="admin-form-header"><div><p className="admin-kicker">{item?"Edit FAQ":"FAQ baru"}</p><h2 className="font-black text-slate-900">{item?.question||"Susun jawaban yang mudah dipahami"}</h2><p className="mt-1 text-xs text-slate-500">Jawaban disimpan sebagai teks aman dan hanya tampil setelah diterbitkan.</p></div>{item&&<span className="admin-status admin-status-neutral">{{ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan' }[item.status] || item.status.replace('_', ' ')}</span>}</div><fieldset disabled={!editable||busy} className="admin-form-body"><div><label htmlFor="faq-question" className="admin-label">Pertanyaan *</label><input id="faq-question" required minLength={5} maxLength={300} className="admin-input" value={value.question} onChange={(event)=>{set("question",event.target.value);if(!item)set("slug",slugify(event.target.value));}}/></div><div className="grid gap-5 md:grid-cols-2"><div><label htmlFor="faq-category" className="admin-label">Kategori *</label><select id="faq-category" required className="admin-input" value={value.category_id||""} onChange={(event)=>set("category_id",event.target.value||null)}><option value="">Pilih kategori</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label htmlFor="faq-sort" className="admin-label">Urutan</label><input id="faq-sort" type="number" min={0} max={10000} className="admin-input" value={value.sort_order} onChange={(event)=>set("sort_order",event.target.value)}/></div></div><div><label htmlFor="faq-answer" className="admin-label">Jawaban *</label><textarea id="faq-answer" required minLength={10} maxLength={10000} rows={8} className="admin-input" value={value.answer} onChange={(event)=>set("answer",event.target.value)} placeholder="Jawab secara ringkas, langsung, dan mudah dipindai."/><p className="mt-2 text-xs text-slate-500">{value.answer.length}/10000 karakter</p></div><details className="admin-disclosure"><summary className="cursor-pointer font-black text-slate-900">Media pendukung <span className="font-normal text-slate-500">(opsional)</span></summary><div className="mt-5 grid gap-4"><MediaPicker imageOnly onSelect={selectMedia} buttonLabel={value.media_asset_id?"Ganti gambar":"Pilih gambar"}/>{value.media_asset_id&&<div className="grid gap-3 md:grid-cols-[1fr_auto]"><div><label htmlFor="faq-media-alt" className="admin-label">Teks alternatif *</label><input id="faq-media-alt" required maxLength={255} className="admin-input" value={value.media_alt||""} onChange={(event)=>set("media_alt",event.target.value)}/></div><button type="button" className="admin-button-secondary self-end" onClick={()=>setValue((current)=>({...current,media_asset_id:null,media_alt:null}))}>Hapus media</button></div>}</div></details><details className="admin-disclosure"><summary className="cursor-pointer font-black text-slate-900">SEO dan alamat publik</summary><div className="mt-5 grid gap-5"><div><label htmlFor="faq-slug" className="admin-label">Slug *</label><input id="faq-slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} className="admin-input" value={value.slug} onChange={(event)=>set("slug",event.target.value)}/><p className="mt-2 text-xs text-slate-500">Anchor publik: /help#{value.slug||"slug-faq"}</p></div><div className="grid gap-5 md:grid-cols-2"><div><label htmlFor="faq-seo-title" className="admin-label">Judul pencarian</label><input id="faq-seo-title" maxLength={200} className="admin-input" value={value.seo_title} onChange={(event)=>set("seo_title",event.target.value)} placeholder={value.question||"Mengikuti pertanyaan"}/></div><div><label htmlFor="faq-meta" className="admin-label">Deskripsi pencarian</label><textarea id="faq-meta" maxLength={500} rows={3} className="admin-input" value={value.meta_description} onChange={(event)=>set("meta_description",event.target.value)} placeholder="Ringkasan jawaban untuk hasil pencarian."/></div></div><label className="flex gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={value.indexable==="true"} onChange={(event)=>set("indexable",String(event.target.checked))}/>Izinkan FAQ masuk structured data dan discovery setelah diterbitkan.</label></div></details></fieldset><div className="admin-form-footer"><button type="button" className="admin-button-secondary" onClick={onCancel}>Tutup</button>{editable&&<button type="submit" className="admin-button" disabled={busy||!value.category_id||!value.slug}>{busy?"Menyimpan…":item?"Simpan perubahan":"Simpan draft FAQ"}</button>}</div></form>{item&&nextActions.length>0&&<section className="admin-form-card"><div className="admin-form-header"><div><h3 className="font-black text-slate-900">Alur Kerja Editorial</h3><p className="mt-1 text-xs text-slate-500">Setiap perubahan status diaudit oleh Portal API.</p></div></div><div className="admin-form-body flex flex-wrap gap-3">{nextActions.map((action)=><button key={action.status} type="button" className={action.status==="published"?"admin-button":"admin-button-secondary"} onClick={async()=>{const result=await transitionFAQAction(item.id,action.status);if(!result.success)onError(result.error||"Status belum dapat diubah");else await onChanged(`FAQ berhasil dipindahkan ke ${{ draft: 'Draf', in_review: 'Peninjauan', published: 'Terbit', archived: 'Diarsipkan' }[action.status] || action.status.replace('_', ' ')}.`);}}>{action.label}</button>)}</div></section>}</div>;
}

type itemAction={status:FAQItem["status"];label:string};
