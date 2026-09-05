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
import { AdminClientPagination } from "@/components/admin-pagination";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type StatusFilter = "all" | FAQItem["status"];

const faqStatusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

const statusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

export default function FAQWorkspacePage() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [items, setItems] = useState<FAQItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<FAQItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });

  const load = useCallback(
    async (selectId?: string) => {
      setLoading(true);
      const result = await getFAQWorkspaceAction({
        q: appliedQuery,
        status,
        categoryId: category,
        page,
        pageSize,
      });
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (
        result.pagination.total_pages > 0 &&
        result.pagination.page > result.pagination.total_pages
      ) {
        setPage(result.pagination.total_pages);
        setLoading(false);
        return;
      }
      setCategories(result.categories);
      setItems(result.items);
      setRoles(result.roles);
      setPagination(result.pagination);
      setError("");
      setLoading(false);
      if (selectId)
        setSelected(result.items.find((item) => item.id === selectId) || null);
      else
        setSelected((current) =>
          current
            ? result.items.find((item) => item.id === current.id) || null
            : null
        );
    },
    [appliedQuery, category, page, pageSize, status]
  );

  useEffect(() => {
    let active = true;
    void getFAQWorkspaceAction({
      q: appliedQuery,
      status,
      categoryId: category,
      page,
      pageSize,
    }).then((result) => {
      if (!active) return;
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (
        result.pagination.total_pages > 0 &&
        result.pagination.page > result.pagination.total_pages
      ) {
        setPage(result.pagination.total_pages);
        setLoading(false);
        return;
      }
      setCategories(result.categories);
      setItems(result.items);
      setPagination(result.pagination);
      setRoles(result.roles);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [appliedQuery, category, page, pageSize, status]);

  const canWrite = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );
  const activeCategories = categories.filter((item) => item.status === "active");

  const beginCreate = () => {
    setSelected(null);
    setCreating(true);
    setError("");
    setNotice("");
  };

  const choose = (item: FAQItem) => {
    setSelected(item);
    setCreating(false);
    setError("");
    setNotice("");
  };

  return (
    <div className="admin-page space-y-6">
      <header className="admin-page-header">
        <div className="max-w-3xl">
          <p className="admin-kicker">Pusat Bantuan</p>
          <h1 className="admin-page-title">FAQ</h1>
          <p className="admin-page-copy">
            Kelola jawaban singkat dan pertanyaan umum dengan alur kerja editorial yang terstruktur.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canWrite && (
            <button
              type="button"
              className="admin-button-secondary font-bold text-xs"
              onClick={() => setShowCategories((value) => !value)}
              aria-expanded={showCategories}
            >
              {showCategories ? "Tutup Kategori" : "Kelola Kategori"}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              className="admin-button flex items-center gap-2 text-xs font-bold"
              onClick={beginCreate}
            >
              <AdminIcon name="plus" className="h-4 w-4" />
              Buat FAQ
            </button>
          )}
        </div>
      </header>

      {error && (
        <div
          className="admin-alert-error rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="admin-alert-success rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm font-bold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
          role="status"
        >
          {notice}
        </div>
      )}

      {showCategories && (
        <CategoryManager
          categories={categories}
          onChanged={async (message) => {
            setNotice(message);
            await load();
          }}
          onError={setError}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
        {/* Left: FAQ List Card */}
        <section
          className="admin-card self-start overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
          aria-labelledby="faq-list-title"
        >
          <div className="admin-card-header border-b border-slate-200 dark:border-slate-800 p-5">
            <h2
              id="faq-list-title"
              className="text-base font-extrabold text-slate-900 dark:text-white"
            >
              Daftar FAQ
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {pagination.total} data di seluruh alur kerja editorial.
            </p>
          </div>

          <div className="admin-card-body p-5 space-y-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setAppliedQuery(query.trim());
              }}
              className="flex gap-2"
            >
              <div className="grow">
                <label htmlFor="faq-search" className="sr-only">
                  Cari FAQ
                </label>
                <input
                  id="faq-search"
                  type="search"
                  className="admin-input text-xs"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari pertanyaan atau jawaban…"
                />
              </div>
              <button className="admin-button-secondary text-xs font-bold" type="submit">
                Cari
              </button>
            </form>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="sr-only" htmlFor="faq-status">
                  Status
                </label>
                <select
                  id="faq-status"
                  className="admin-input text-xs"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">Semua status</option>
                  <option value="draft">Draf</option>
                  <option value="in_review">Dalam peninjauan</option>
                  <option value="approved">Disetujui</option>
                  <option value="published">Terbit</option>
                  <option value="archived">Arsip</option>
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="faq-category-filter">
                  Kategori
                </label>
                <select
                  id="faq-category-filter"
                  className="admin-input text-xs"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua kategori</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500" role="status">
                Memuat FAQ…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                Belum ada FAQ yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => choose(item)}
                    className={`w-full rounded-xl border p-3.5 text-left transition flex items-start justify-between gap-3 ${
                      selected?.id === item.id
                        ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {item.question}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.category_name} · /{item.slug}
                      </p>
                    </div>
                    <span
                      className={`cuba-badge shrink-0 text-[10px] ${
                        faqStatusBadgeClasses[item.status] ||
                        "cuba-badge-neutral"
                      }`}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <AdminClientPagination
                page={pagination.page}
                pages={pagination.total_pages}
                total={pagination.total}
                pageSize={pagination.page_size}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </section>

        {/* Right: Workspace Detail / Editor */}
        <section>
          {creating || selected ? (
            <FAQEditor
              key={selected?.id || "create"}
              item={selected}
              categories={activeCategories}
              canWrite={canWrite}
              roles={roles}
              onSaved={async (id, message) => {
                setNotice(message);
                setCreating(false);
                await load(id);
              }}
              onChanged={async (message) => {
                setNotice(message);
                await load(selected?.id);
              }}
              onError={setError}
              onCancel={() => {
                setCreating(false);
                setSelected(null);
              }}
            />
          ) : (
            <div className="admin-empty rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="admin-stat-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                <AdminIcon name="folder" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Pilih FAQ untuk melihat detail
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Pilih salah satu FAQ dari panel di sebelah kiri atau buat FAQ baru untuk memulai alur kerja editorial.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CategoryManager({
  categories,
  onChanged,
  onError,
}: {
  categories: FAQCategory[];
  onChanged: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = slugify(name);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await createFAQCategoryAction({
      name: name.trim(),
      slug,
      description: description.trim(),
      sort_order: categories.length * 10 + 10,
    });
    setBusy(false);
    if (!result.success) {
      onError(result.error || "Kategori belum dapat dibuat");
      return;
    }
    setName("");
    setDescription("");
    await onChanged("Kategori FAQ berhasil dibuat.");
  };

  return (
    <section className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-5 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          Kategori FAQ
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Kelompokkan pertanyaan umum ke dalam kategori yang mudah dipahami pembaca.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1.5fr_auto]">
        <div>
          <label htmlFor="faq-category-name" className="admin-label font-bold text-slate-800 dark:text-slate-200">
            Nama Kategori *
          </label>
          <input
            id="faq-category-name"
            required
            maxLength={120}
            className="admin-input mt-1.5"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Akun & Autentikasi"
          />
          <p className="mt-1.5 text-[11px] text-slate-500 font-mono">
            Slug: {slug || "dibuat-otomatis"}
          </p>
        </div>
        <div>
          <label htmlFor="faq-category-description" className="admin-label font-bold text-slate-800 dark:text-slate-200">
            Deskripsi Kategori
          </label>
          <input
            id="faq-category-description"
            maxLength={500}
            className="admin-input mt-1.5"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Penjelasan ringkas cakupan kategori ini..."
          />
        </div>
        <div className="self-end pb-0.5">
          <button
            className="admin-button font-bold text-xs"
            disabled={busy || !slug}
          >
            {busy ? "Menyimpan…" : "+ Tambah Kategori"}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 pt-2">
        {categories.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-800/20"
          >
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {item.name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                /{item.slug} · {item.status === "active" ? "Aktif" : "Diarsipkan"}
              </p>
            </div>
            {item.status === "active" && (
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                onClick={async () => {
                  if (!window.confirm(`Arsipkan kategori “${item.name}”?`)) return;
                  const result = await archiveFAQCategoryAction(item.id);
                  if (!result.success)
                    onError(result.error || "Kategori belum dapat diarsipkan");
                  else await onChanged("Kategori FAQ berhasil diarsipkan.");
                }}
              >
                Arsipkan
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

type FAQDraft = DraftPayload & {
  category_id: string | null;
  slug: string;
  question: string;
  answer: string;
  sort_order: string;
  media_asset_id: string | null;
  media_alt: string | null;
  seo_title: string;
  meta_description: string;
  indexable: string;
};

function FAQEditor({
  item,
  categories,
  canWrite,
  roles,
  onSaved,
  onChanged,
  onError,
  onCancel,
}: {
  item: FAQItem | null;
  categories: FAQCategory[];
  canWrite: boolean;
  roles: string[];
  onSaved: (id: string, message: string) => Promise<void>;
  onChanged: (message: string) => Promise<void>;
  onError: (message: string) => void;
  onCancel: () => void;
}) {
  const initial = useMemo<FAQDraft>(
    () => ({
      category_id: item?.category_id || categories[0]?.id || null,
      slug: item?.slug || "",
      question: item?.question || "",
      answer: item?.answer || "",
      sort_order: String(item?.sort_order ?? 10),
      media_asset_id: item?.media_asset_id || null,
      media_alt: item?.media_alt || null,
      seo_title: item?.seo_title || "",
      meta_description: item?.meta_description || "",
      indexable: String(item?.indexable ?? true),
    }),
    [categories, item]
  );

  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const editable = canWrite && (!item || item.status === "draft");

  const apply = (draft: FAQDraft) => setValue(draft);
  const autoSave = useAutoSaveDraft({
    formKey: item ? "faq.edit" : "faq.create",
    entityType: "faq_item",
    entityId: item?.id,
    baseEntityVersion: item ? String(item.version) : undefined,
    value,
    emptyValue: initial,
    enabled: editable,
    onRecover: apply,
    onStartNew: apply,
  });

  const set = <K extends keyof FAQDraft>(key: K, next: FAQDraft[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  const selectMedia = (media: MediaSelection) => {
    setValue((current) => ({
      ...current,
      media_asset_id: media.id,
      media_alt: media.insertion_alt_text || media.alt_text || null,
    }));
    autoSave.requestImmediateSave();
  };

  const input = (): FAQInput => ({
    category_id: value.category_id || "",
    slug: value.slug,
    question: value.question,
    answer: value.answer,
    sort_order: Number.parseInt(value.sort_order, 10) || 0,
    media_asset_id: value.media_asset_id,
    media_alt: value.media_asset_id ? value.media_alt : null,
    seo_title: value.seo_title,
    meta_description: value.meta_description,
    indexable: value.indexable === "true",
    expected_version: item?.version,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = item
      ? await updateFAQAction(item.id, input())
      : await createFAQAction(input());
    setBusy(false);
    if (!result.success) {
      onError(result.error || "FAQ belum dapat disimpan");
      return;
    }
    await autoSave.finalize();
    await onSaved(
      result.data!.id,
      item ? "FAQ berhasil diperbarui." : "Draf FAQ berhasil dibuat."
    );
  };

  const reviewer = roles.some((role) =>
    ["Portal Administrator", "Reviewer"].includes(role)
  );

  const nextActions: itemAction[] = [];
  if (item?.status === "draft" && canWrite)
    nextActions.push({ status: "in_review", label: "Ajukan peninjauan" });
  if (item?.status === "in_review" && reviewer)
    nextActions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "approved", label: "Setujui" }
    );
  if (item?.status === "approved" && reviewer)
    nextActions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "published", label: "Terbitkan" }
    );
  if (item?.status === "published" && (canWrite || reviewer))
    nextActions.push({ status: "archived", label: "Arsipkan" });

  return (
    <div className="space-y-6">
      {editable && (
        <DraftStatus
          state={autoSave.state}
          message={autoSave.message}
          lastSavedAt={autoSave.lastSavedAt}
          recovery={autoSave.recovery}
          onRecover={autoSave.recoverFrom}
          onKeepCurrent={autoSave.keepCurrent}
          onDiscard={autoSave.discard}
          onStartNew={autoSave.startNew}
          onRetry={autoSave.saveNow}
        />
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Card 1: Isi Pertanyaan & Jawaban */}
        <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                {item ? "Edit FAQ" : "FAQ Baru"}
              </p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {item?.question || "Susun jawaban yang mudah dipahami"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Jawaban disimpan sebagai teks aman dan hanya tampil setelah diterbitkan.
              </p>
            </div>
            {item && (
              <span
                className={`cuba-badge self-start sm:self-center ${
                  faqStatusBadgeClasses[item.status] || "cuba-badge-neutral"
                }`}
              >
                {statusLabels[item.status] || item.status}
              </span>
            )}
          </div>

          <fieldset disabled={!editable || busy} className="space-y-5">
            <div>
              <label htmlFor="faq-question" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                Pertanyaan *
              </label>
              <input
                id="faq-question"
                required
                minLength={5}
                maxLength={300}
                className="admin-input mt-2"
                value={value.question}
                onChange={(event) => {
                  set("question", event.target.value);
                  if (!item) set("slug", slugify(event.target.value));
                }}
                placeholder="Contoh: Bagaimana cara mengakses materi pembelajaran offline?"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="faq-category" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                  Kategori *
                </label>
                <select
                  id="faq-category"
                  required
                  className="admin-input mt-2"
                  value={value.category_id || ""}
                  onChange={(event) =>
                    set("category_id", event.target.value || null)
                  }
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="faq-sort" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                  Urutan Tampil
                </label>
                <input
                  id="faq-sort"
                  type="number"
                  min={0}
                  max={10000}
                  className="admin-input mt-2"
                  value={value.sort_order}
                  onChange={(event) => set("sort_order", event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="faq-answer" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                Jawaban *
              </label>
              <textarea
                id="faq-answer"
                required
                minLength={10}
                maxLength={10000}
                rows={7}
                className="admin-input mt-2"
                value={value.answer}
                onChange={(event) => set("answer", event.target.value)}
                placeholder="Jawab secara ringkas, langsung, dan mudah dipindai pembaca..."
              />
              <p className="mt-1.5 text-right text-[11px] text-slate-400">
                {value.answer.length}/10000 karakter
              </p>
            </div>
          </fieldset>
        </div>

        {/* Card 2: Media Pendukung */}
        <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Media Pendukung <span className="font-normal text-xs text-slate-500">(opsional)</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sertakan ilustrasi atau diagram untuk memperjelas jawaban FAQ.
            </p>
          </div>
          <fieldset disabled={!editable || busy} className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <MediaPicker
                imageOnly
                onSelect={selectMedia}
                buttonLabel={value.media_asset_id ? "Ganti gambar" : "Pilih gambar"}
              />
              {value.media_asset_id && (
                <button
                  type="button"
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  onClick={() =>
                    setValue((current) => ({
                      ...current,
                      media_asset_id: null,
                      media_alt: null,
                    }))
                  }
                >
                  Hapus media
                </button>
              )}
            </div>
            {value.media_asset_id && (
              <div>
                <label htmlFor="faq-media-alt" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                  Teks alternatif gambar (Alt Text) *
                </label>
                <input
                  id="faq-media-alt"
                  required
                  maxLength={255}
                  className="admin-input mt-1.5"
                  value={value.media_alt || ""}
                  onChange={(event) => set("media_alt", event.target.value)}
                  placeholder="Deskripsikan gambar untuk aksesibilitas..."
                />
              </div>
            )}
          </fieldset>
        </div>

        {/* Card 3: SEO dan Alamat Publik */}
        <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              SEO dan Alamat Publik
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pengaturan metadata penemuan dan jangkar tautan halaman bantuan.
            </p>
          </div>
          <fieldset disabled={!editable || busy} className="space-y-4 pt-1">
            <div>
              <label htmlFor="faq-slug" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                Slug URL *
              </label>
              <input
                id="faq-slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                maxLength={160}
                className="admin-input mt-2"
                value={value.slug}
                onChange={(event) => set("slug", event.target.value)}
                placeholder="slug-pertanyaan-faq"
              />
              <p className="mt-1.5 text-xs text-slate-500 font-mono">
                Jangkar publik: /help#{value.slug || "slug-faq"}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="faq-seo-title" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                  Judul Pencarian SEO
                </label>
                <input
                  id="faq-seo-title"
                  maxLength={200}
                  className="admin-input mt-2"
                  value={value.seo_title}
                  onChange={(event) => set("seo_title", event.target.value)}
                  placeholder={value.question || "Mengikuti pertanyaan"}
                />
              </div>
              <div>
                <label htmlFor="faq-meta" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                  Deskripsi Pencarian SEO
                </label>
                <textarea
                  id="faq-meta"
                  maxLength={500}
                  rows={2}
                  className="admin-input mt-2"
                  value={value.meta_description}
                  onChange={(event) => set("meta_description", event.target.value)}
                  placeholder="Ringkasan jawaban untuk hasil pencarian..."
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                className="cuba-checkbox rounded text-sky-600"
                checked={value.indexable === "true"}
                onChange={(event) => set("indexable", String(event.target.checked))}
              />
              Izinkan FAQ masuk data terstruktur dan pencarian publik setelah diterbitkan
            </label>
          </fieldset>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="admin-button-secondary"
            onClick={onCancel}
          >
            Tutup
          </button>
          {editable && (
            <button
              type="submit"
              className="admin-button"
              disabled={busy || !value.category_id || !value.slug}
            >
              {busy
                ? "Menyimpan…"
                : item
                ? "Simpan perubahan"
                : "Simpan draf FAQ"}
            </button>
          )}
        </div>
      </form>

      {/* Reviewer Action Bar */}
      {item && nextActions.length > 0 && (
        <section className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Alur Kerja Editorial
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Setiap perubahan status diaudit secara menyeluruh oleh Portal API.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            {nextActions.map((action) => (
              <button
                key={action.status}
                type="button"
                className={
                  action.status === "published"
                    ? "admin-button"
                    : "admin-button-secondary"
                }
                onClick={async () => {
                  const result = await transitionFAQAction(item.id, action.status);
                  if (!result.success)
                    onError(result.error || "Status belum dapat diubah");
                  else
                    await onChanged(
                      `FAQ berhasil dipindahkan ke ${
                        statusLabels[action.status] || action.status
                      }.`
                    );
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type itemAction = { status: FAQItem["status"]; label: string };
