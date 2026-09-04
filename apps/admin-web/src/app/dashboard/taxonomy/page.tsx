"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveTaxonomyTermAction,
  createTaxonomyTermAction,
  getTaxonomyAction,
} from "@/app/actions/discoverability";
import { AdminIcon } from "@/components/admin-icon";
import type { TaxonomyTerm } from "@/components/seo/types";
import { AdminClientPagination } from "@/components/admin-pagination";

type Kind = "categories" | "tags";
type StatusFilter = "active" | "archived" | "all";
type CreateTermInput = { name: string; description: string };

const termConfig: Record<Kind, {
  title: string;
  singular: string;
  copy: string;
  guidance: string;
}> = {
  categories: {
    title: "Kategori",
    singular: "kategori",
    copy: "Kelompok utama untuk membantu pembaca memahami topik konten.",
    guidance: "Pilih satu kategori yang paling mewakili isi saat mengedit konten.",
  },
  tags: {
    title: "Tag",
    singular: "tag",
    copy: "Label tambahan yang dapat dipakai ulang untuk pencarian dan keterkaitan konten.",
    guidance: "Gunakan tag secara selektif; hindari istilah yang sama dengan kategori.",
  },
};

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export default function TaxonomyPage() {
  const [categories, setCategories] = useState<TaxonomyTerm[]>([]);
  const [tags, setTags] = useState<TaxonomyTerm[]>([]);
  const [activeKind, setActiveKind] = useState<Kind>("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const applyTerms = useCallback((next: { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] }) => {
    setCategories(next.categories);
    setTags(next.tags);
    setError("");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTaxonomyAction(true);
    if (!result.success) setError(result.error || "Kategori dan tag belum dapat dimuat");
    else applyTerms(result.data);
    setLoading(false);
  }, [applyTerms]);

  useEffect(() => {
    let active = true;
    void getTaxonomyAction(true).then((result) => {
      if (!active) return;
      if (!result.success) setError(result.error || "Kategori dan tag belum dapat dimuat");
      else applyTerms(result.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [applyTerms]);

  const create = async (kind: Kind, input: CreateTermInput) => {
    const name = input.name.trim();
    const description = input.description.trim();
    const slug = slugify(name);
    const config = termConfig[kind];

    if (!name || !slug) {
      setError(`Nama ${config.singular} harus menghasilkan slug yang valid.`);
      return false;
    }

    setBusy(`create:${kind}`);
    setError("");
    setNotice("");
    const result = await createTaxonomyTermAction(kind, { name, slug, description });
    if (!result.success) {
      setError(result.error || `${config.title} belum dapat dibuat`);
      setBusy("");
      return false;
    }

    await load();
    setBusy("");
    setNotice(`${config.title} “${name}” berhasil ditambahkan.`);
    return true;
  };

  const archive = async (kind: Kind, term: TaxonomyTerm) => {
    const config = termConfig[kind];
    if (!window.confirm(`Arsipkan ${config.singular} “${term.name}”? Relasi historis tetap dipertahankan.`)) return;

    setBusy(term.id);
    setError("");
    setNotice("");
    const result = await archiveTaxonomyTermAction(kind, term.id);
    if (!result.success) setError(result.error || `${config.title} belum dapat diarsipkan`);
    else {
      await load();
      setNotice(`${config.title} “${term.name}” berhasil diarsipkan.`);
    }
    setBusy("");
  };

  const activeCategoryCount = categories.filter((term) => term.status === "active").length;
  const activeTagCount = tags.filter((term) => term.status === "active").length;
  const activeTerms = activeKind === "categories" ? categories : tags;

  const selectKind = (kind: Kind, moveFocus = false) => {
    setActiveKind(kind);
    setError("");
    setNotice("");
    if (moveFocus) requestAnimationFrame(() => document.getElementById(`taxonomy-tab-${kind}`)?.focus());
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, kind: Kind) => {
    const nextKind = kind === "categories" ? "tags" : "categories";
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      selectKind(nextKind, true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      selectKind(event.key === "Home" ? "categories" : "tags", true);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="max-w-3xl">
          <p className="admin-kicker">Struktur penemuan konten</p>
          <h1 className="admin-page-title">Kategori &amp; Tag</h1>
          <p className="admin-page-copy">
            Siapkan istilah yang konsisten agar editor lebih mudah mengelompokkan konten dan pembaca lebih mudah menemukannya.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Ringkasan taksonomi aktif">
          <span className="admin-discovery-chip" data-accent="true">{activeCategoryCount} kategori aktif</span>
          <span className="admin-discovery-chip" data-accent="true">{activeTagCount} tag aktif</span>
        </div>
      </header>

      {error && <div className="admin-alert-error mb-5" role="alert">{error}</div>}
      {notice && <div className="admin-alert-success mb-5" role="status">{notice}</div>}

      <section className="admin-form-card" aria-labelledby="taxonomy-workspace-title">
        <div className="admin-form-header">
          <div className="flex items-start gap-3">
            <span className="admin-stat-icon shrink-0"><AdminIcon name="folder" className="h-5 w-5" /></span>
            <div>
              <h2 id="taxonomy-workspace-title" className="font-black text-slate-900">Kelola istilah konten</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Pilih jenis istilah, tambahkan bila diperlukan, lalu gunakan dari form Berita, Pengumuman, atau Pusat Pengetahuan.
              </p>
            </div>
          </div>
        </div>

        <div className="admin-taxonomy-tabs" role="tablist" aria-label="Pilih jenis taxonomy">
          {(["categories", "tags"] as const).map((kind) => {
            const config = termConfig[kind];
            const terms = kind === "categories" ? categories : tags;
            return (
              <button
                key={kind}
                id={`taxonomy-tab-${kind}`}
                type="button"
                role="tab"
                aria-selected={activeKind === kind}
                aria-controls={`taxonomy-panel-${kind}`}
                tabIndex={activeKind === kind ? 0 : -1}
                className="admin-taxonomy-tab"
                onClick={() => selectKind(kind)}
                onKeyDown={(event) => handleTabKeyDown(event, kind)}
              >
                <span>{config.title}</span>
                <span className="admin-taxonomy-tab-count">{terms.length}</span>
              </button>
            );
          })}
        </div>

        <TermPanel
          key={activeKind}
          kind={activeKind}
          terms={activeTerms}
          loading={loading}
          busy={busy}
          onCreate={create}
          onArchive={archive}
        />
      </section>
    </div>
  );
}

function TermPanel({
  kind,
  terms,
  loading,
  busy,
  onCreate,
  onArchive,
}: {
  kind: Kind;
  terms: TaxonomyTerm[];
  loading: boolean;
  busy: string;
  onCreate: (kind: Kind, input: CreateTermInput) => Promise<boolean>;
  onArchive: (kind: Kind, term: TaxonomyTerm) => Promise<void>;
}) {
  const config = termConfig[kind];
  const [showComposer, setShowComposer] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const slug = slugify(name);
  const isCreating = busy === `create:${kind}`;

  const filteredTerms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...terms]
      .filter((term) => statusFilter === "all" || term.status === statusFilter)
      .filter((term) => !normalizedQuery || [term.name, term.slug, term.description || ""]
        .some((value) => value.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [query, statusFilter, terms]);
  const totalPages = Math.max(1, Math.ceil(filteredTerms.length / pageSize));
  const visibleTerms = filteredTerms.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);

  const resetComposer = () => {
    setName("");
    setDescription("");
    setShowComposer(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await onCreate(kind, { name, description });
    if (created) resetComposer();
  };

  return (
    <div
      id={`taxonomy-panel-${kind}`}
      role="tabpanel"
      aria-labelledby={`taxonomy-tab-${kind}`}
      className="admin-form-body"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-xl font-black text-slate-900">{config.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{config.copy}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{config.guidance}</p>
        </div>
        <button
          type="button"
          className={showComposer ? "admin-button-secondary shrink-0" : "admin-button shrink-0"}
          aria-expanded={showComposer}
          aria-controls={`${kind}-composer`}
          onClick={() => setShowComposer((current) => !current)}
        >
          {showComposer ? "Tutup form" : `Tambah ${config.title}`}
        </button>
      </div>

      {showComposer && (
        <form id={`${kind}-composer`} className="admin-taxonomy-composer" onSubmit={submit}>
          <div className="flex flex-col gap-1">
            <p className="font-black text-slate-900">Tambah {config.singular} baru</p>
            <p className="text-xs leading-5 text-slate-500">Nama harus unik. Slug dibuat otomatis dan ditampilkan sebelum disimpan.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="admin-label" htmlFor={`${kind}-name`}>Nama {config.title} *</label>
              <input
                id={`${kind}-name`}
                name="name"
                className="admin-input"
                required
                autoFocus
                autoComplete="off"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={`${kind}-name-help`}
                placeholder={kind === "categories" ? "Contoh: Pengembangan Kompetensi" : "Contoh: Kepemimpinan"}
              />
              <p id={`${kind}-name-help`} className="mt-2 text-xs text-slate-500">{name.length}/120 karakter</p>
            </div>
            <div>
              <label className="admin-label" htmlFor={`${kind}-slug`}>Slug otomatis</label>
              <input
                id={`${kind}-slug`}
                className="admin-input"
                readOnly
                value={slug}
                placeholder="dibuat-dari-nama"
                aria-describedby={`${kind}-slug-help`}
              />
              <p id={`${kind}-slug-help`} className="mt-2 text-xs text-slate-500">Dipakai sebagai identitas teknis dan tidak perlu diketik manual.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="admin-label mb-2" htmlFor={`${kind}-description`}>Deskripsi <span className="font-normal">(opsional)</span></label>
              <span className="text-xs text-slate-500" aria-live="polite">{description.length}/1000</span>
            </div>
            <textarea
              id={`${kind}-description`}
              name="description"
              className="admin-input"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan kapan istilah ini sebaiknya digunakan oleh editor."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="admin-button-secondary" disabled={isCreating} onClick={resetComposer}>Batal</button>
            <button type="submit" className="admin-button" disabled={isCreating || !name.trim() || !slug}>
              {isCreating ? "Menyimpan…" : `Simpan ${config.title}`}
            </button>
          </div>
        </form>
      )}

      <div className="admin-taxonomy-toolbar">
        <div className="relative min-w-0 flex-1">
          <AdminIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <label className="sr-only" htmlFor={`${kind}-search`}>Cari {config.singular}</label>
          <input
            id={`${kind}-search`}
            type="search"
            className="admin-input pl-11"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder={`Cari nama, slug, atau deskripsi ${config.singular}…`}
          />
        </div>
        <div className="sm:w-48">
          <label className="sr-only" htmlFor={`${kind}-status`}>Filter status</label>
          <select
            id={`${kind}-status`}
            className="admin-input"
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}
          >
            <option value="active">Aktif</option>
            <option value="archived">Diarsipkan</option>
            <option value="all">Semua status</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500" aria-live="polite">
        <span>{filteredTerms.length} {config.singular} ditampilkan</span>
        {(query || statusFilter !== "active") && (
            <button type="button" className="font-bold text-sky-700" onClick={() => { setQuery(""); setStatusFilter("active"); setPage(1); }}>
            Reset filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-empty" role="status">Memuat {config.title.toLowerCase()}…</div>
      ) : filteredTerms.length === 0 ? (
        <div className="admin-empty rounded-2xl border border-slate-200">
          <span className="admin-stat-icon mx-auto"><AdminIcon name="search" className="h-5 w-5" /></span>
          <p className="mt-4 font-black text-slate-900">Tidak ada {config.singular} yang sesuai</p>
          <p className="mt-1 text-sm">Ubah kata pencarian atau filter status, atau tambahkan {config.singular} baru.</p>
        </div>
      ) : (
        <ul className="grid gap-3" aria-label={`Daftar ${config.title}`}>
          {visibleTerms.map((term) => (
            <li key={term.id} className="admin-taxonomy-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-900 dark:text-white">{term.name}</p>
                  <span className={`cuba-badge ${term.status === "active" ? "cuba-badge-success" : "cuba-badge-neutral"}`}>
                    {term.status === "active" ? "Aktif" : "Diarsipkan"}
                  </span>
                </div>
                {term.description && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{term.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <code className="admin-taxonomy-slug">/{term.slug}</code>
                  <span>{term.usage_count} penggunaan</span>
                </div>
              </div>
              {term.status === "active" && (
                <button
                  type="button"
                  className="admin-button-secondary w-full shrink-0 sm:w-auto hover:!border-rose-300 hover:!text-rose-600"
                  disabled={busy === term.id}
                  onClick={() => void onArchive(kind, term)}
                >
                  {busy === term.id ? "Mengarsipkan…" : "Arsipkan"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <AdminClientPagination page={Math.min(page, totalPages)} pages={totalPages} total={filteredTerms.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </div>
  );
}
