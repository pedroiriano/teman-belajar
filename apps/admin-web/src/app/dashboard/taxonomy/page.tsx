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
import { AdminDataTable } from "@/components/admin-data-table";

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
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const slug = slugify(name);
  const isCreating = busy === `create:${kind}`;

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filteredTerms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...terms]
      .filter((term) => statusFilter === "all" || term.status === statusFilter)
      .filter((term) =>
        !normalizedQuery ||
        [term.name, term.slug, term.description || ""].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        )
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortKey === "name") {
          comparison = a.name.localeCompare(b.name, "id");
        } else if (sortKey === "slug") {
          comparison = a.slug.localeCompare(b.slug);
        } else if (sortKey === "usage_count") {
          comparison = (a.usage_count || 0) - (b.usage_count || 0);
        } else if (sortKey === "status") {
          comparison = a.status.localeCompare(b.status);
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [query, statusFilter, terms, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredTerms.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTerms = filteredTerms.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const allCurrentKeys = visibleTerms.map((t) => t.id);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((id) => selectedIds.has(id));
  const isSomeSelected =
    allCurrentKeys.some((id) => selectedIds.has(id)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((id) => next.add(id));
      } else {
        allCurrentKeys.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {config.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {config.copy}
          </p>
        </div>
        <button
          type="button"
          className={
            showComposer
              ? "admin-button-secondary shrink-0 font-bold text-xs"
              : "admin-button shrink-0 font-bold text-xs"
          }
          aria-expanded={showComposer}
          aria-controls={`${kind}-composer`}
          onClick={() => setShowComposer((current) => !current)}
        >
          {showComposer ? "Tutup Formulir" : `+ Tambah ${config.title}`}
        </button>
      </div>

      {showComposer && (
        <form
          id={`${kind}-composer`}
          className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-5 shadow-sm"
          onSubmit={submit}
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
              Tambah {config.singular} Baru
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nama harus unik. Slug dibuat otomatis dan divalidasi oleh sistem.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                className="admin-label font-bold text-slate-800 dark:text-slate-200"
                htmlFor={`${kind}-name`}
              >
                Nama {config.title} *
              </label>
              <input
                id={`${kind}-name`}
                name="name"
                className="admin-input mt-2"
                required
                autoFocus
                autoComplete="off"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby={`${kind}-name-help`}
                placeholder={
                  kind === "categories"
                    ? "Contoh: Pengembangan Kompetensi"
                    : "Contoh: Kepemimpinan"
                }
              />
              <p
                id={`${kind}-name-help`}
                className="mt-1.5 text-[11px] text-slate-500"
              >
                {name.length}/120 karakter
              </p>
            </div>
            <div>
              <label
                className="admin-label font-bold text-slate-800 dark:text-slate-200"
                htmlFor={`${kind}-slug`}
              >
                Slug URL Otomatis
              </label>
              <input
                id={`${kind}-slug`}
                className="admin-input mt-2 bg-slate-50 dark:bg-slate-800"
                readOnly
                value={slug}
                placeholder="dibuat-dari-nama"
                aria-describedby={`${kind}-slug-help`}
              />
              <p
                id={`${kind}-slug-help`}
                className="mt-1.5 text-[11px] text-slate-500"
              >
                Dipakai sebagai identitas URL dan tidak perlu diketik manual.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                className="admin-label font-bold text-slate-800 dark:text-slate-200 mb-1"
                htmlFor={`${kind}-description`}
              >
                Deskripsi <span className="font-normal text-xs text-slate-500">(opsional)</span>
              </label>
              <span className="text-[11px] text-slate-500" aria-live="polite">
                {description.length}/1000
              </span>
            </div>
            <textarea
              id={`${kind}-description`}
              name="description"
              className="admin-input mt-1"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan kapan istilah ini sebaiknya digunakan oleh editor..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="admin-button-secondary text-xs"
              disabled={isCreating}
              onClick={resetComposer}
            >
              Batal
            </button>
            <button
              type="submit"
              className="admin-button text-xs font-bold"
              disabled={isCreating || !name.trim() || !slug}
            >
              {isCreating ? "Menyimpan…" : `Simpan ${config.title}`}
            </button>
          </div>
        </form>
      )}

      {/* Cuba DataTable presentation with checkboxes & pagination */}
      <AdminDataTable
        title={`Daftar ${config.title}`}
        description={`Katalog ${config.singular} yang dapat digunakan untuk penandaan materi.`}
        itemCount={filteredTerms.length}
        headers={[
          { label: "Nama & Deskripsi", key: "name", sortable: true },
          { label: "Slug", key: "slug", sortable: true },
          { label: "Penggunaan", key: "usage_count", sortable: true },
          { label: "Status", key: "status", sortable: true },
          { label: "Aksi", key: "actions", align: "right" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        searchQuery={query}
        onSearchChange={(q) => {
          setQuery(q);
          setPage(1);
        }}
        searchPlaceholder={`Cari nama, slug, atau deskripsi ${config.singular}…`}
        statusFilter={statusFilter}
        statusOptions={[
          { value: "active", label: "Aktif" },
          { value: "archived", label: "Diarsipkan" },
          { value: "all", label: "Semua status" },
        ]}
        onStatusFilterChange={(val) => {
          setStatusFilter(val as StatusFilter);
          setPage(1);
        }}
        selectable
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        emptyState={`Tidak ada ${config.singular} yang sesuai.`}
        paginationSlot={
          <AdminClientPagination
            page={currentPage}
            pages={totalPages}
            total={filteredTerms.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        {visibleTerms.map((term) => {
          const isChecked = selectedIds.has(term.id);
          return (
            <tr
              key={term.id}
              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(term.id)}
                  aria-label={`Pilih ${term.name}`}
                />
              </td>
              <td className="px-6 py-4">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {term.name}
                </p>
                {term.description && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {term.description}
                  </p>
                )}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                <code className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">
                  /{term.slug}
                </code>
              </td>
              <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                <span className="font-bold text-slate-900 dark:text-white">
                  {term.usage_count}
                </span>{" "}
                konten
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`cuba-badge ${
                    term.status === "active"
                      ? "cuba-badge-success"
                      : "cuba-badge-neutral"
                  }`}
                >
                  {term.status === "active" ? "Aktif" : "Diarsipkan"}
                </span>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                {term.status === "active" && (
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    disabled={busy === term.id}
                    onClick={() => void onArchive(kind, term)}
                  >
                    {busy === term.id ? "Mengarsipkan…" : "Arsipkan"}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </AdminDataTable>
    </div>
  );
}
