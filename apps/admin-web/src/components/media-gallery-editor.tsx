"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MediaPicker from "@/components/media/MediaPicker";
import { AdminIcon } from "@/components/admin-icon";
import { AdminClientPagination } from "@/components/admin-pagination";

type Kind = "image_gallery" | "video_hub";
type Status = "draft" | "in_review" | "approved" | "published" | "archived";

type GalleryItem = {
  id?: string;
  media_id: string;
  sort_order: number;
  featured: boolean;
  caption?: string;
  alt_text?: string;
  decorative: boolean;
  transcript?: string;
  mime_type?: string;
  display_filename?: string;
};

type Collection = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: Kind;
  status: Status;
  featured: boolean;
  seo_title?: string;
  seo_description?: string;
  indexable: boolean;
  version: number;
  items: GalleryItem[];
};

type Draft = Omit<Collection, "id" | "status" | "version">;

const empty: Draft = {
  slug: "",
  title: "",
  summary: "",
  kind: "image_gallery",
  featured: false,
  indexable: true,
  items: [],
};

const labels: Record<Status, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Arsip",
};

const statusBadgeClasses: Record<Status, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

const kindLabels: Record<Kind, string> = {
  image_gallery: "Galeri foto",
  video_hub: "Video Hub",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const fromCollection = (item: Collection): Draft => ({
  slug: item.slug,
  title: item.title,
  summary: item.summary,
  kind: item.kind,
  featured: item.featured,
  seo_title: item.seo_title || "",
  seo_description: item.seo_description || "",
  indexable: item.indexable,
  items: item.items.map((media) => ({
    ...media,
    caption: media.caption || "",
    alt_text: media.alt_text || "",
    transcript: media.transcript || "",
  })),
});

const toInput=(draft: Draft) => ({
  slug: draft.slug,
  title: draft.title,
  summary: draft.summary,
  kind: draft.kind,
  featured: draft.featured,
  seo_title: draft.seo_title,
  seo_description: draft.seo_description,
  indexable: draft.indexable,
  items: draft.items.map((item) => ({
    media_id: item.media_id,
    sort_order: item.sort_order,
    featured: item.featured,
    caption: item.caption,
    alt_text: item.alt_text,
    decorative: item.decorative,
    transcript: item.transcript,
  })),
});

const responseError = (status: number) =>
  status === 401
    ? "Sesi Admin berakhir. Silakan masuk kembali."
    : status === 403
    ? "Anda tidak memiliki izin untuk tindakan ini."
    : status === 409
    ? "Koleksi berubah. Muat ulang sebelum menyimpan."
    : status === 422
    ? "Periksa kembali metadata, aset, urutan, dan tahap koleksi."
    : "Galeri sementara tidak tersedia.";

export default function MediaGalleryEditor({ roles }: { roles: string[] }) {
  const [items, setItems] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canWrite = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );
  const canReview = roles.some((role) =>
    ["Portal Administrator", "Reviewer"].includes(role)
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        kind,
        status,
        page: String(page),
        page_size: "12",
      });
      const response = await fetch(`/api/bff/media-collections?${params}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(responseError(response.status));
      setItems(payload.data || []);
      setTotalPages(Math.max(1, payload.total_pages || 1));
      setError("");
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Galeri belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [query, kind, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const choose = (item: Collection) => {
    setSelected(item);
    setDraft(fromCollection(item));
    setCreating(false);
    setError("");
    setNotice("");
  };

  const startCreate = () => {
    setSelected(null);
    setDraft(empty);
    setCreating(true);
    setError("");
    setNotice("");
  };

  const editable = canWrite && (!selected || selected.status === "draft");

  const addMedia = (media: {
    id: string;
    detected_mime_type: string;
    display_filename: string | null;
    original_filename: string | null;
    insertion_alt_text: string;
    decorative: boolean;
  }) => {
    if (draft.items.some((item) => item.media_id === media.id)) {
      setError("Aset sudah ada dalam koleksi.");
      return;
    }
    set("items", [
      ...draft.items,
      {
        media_id: media.id,
        sort_order: draft.items.length,
        featured: draft.items.length === 0,
        caption: "",
        alt_text: draft.kind === "image_gallery" ? media.insertion_alt_text : "",
        decorative: draft.kind === "image_gallery" && media.decorative,
        transcript: "",
        mime_type: media.detected_mime_type,
        display_filename: media.display_filename || media.original_filename || "Media",
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<GalleryItem>) =>
    set("items", draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeItem = (index: number) => {
    const nextItems = draft.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sort_order: i }));
    if (nextItems.length > 0 && !nextItems.some((item) => item.featured)) {
      nextItems[0] = { ...nextItems[0], featured: true };
    }
    set("items", nextItems);
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.items.length) return;
    const copy = [...draft.items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    set("items", copy.map((item, i) => ({ ...item, sort_order: i })));
  };

  const feature = (index: number) =>
    set("items", draft.items.map((item, i) => ({ ...item, featured: i === index })));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = toInput(draft);
      const response = await fetch(
        selected ? `/api/bff/media-collections/${selected.id}` : "/api/bff/media-collections",
        {
          method: selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            selected ? { expected_version: selected.version, collection:input } : input
          ),
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(responseError(response.status));
      setSelected(payload.data);
      setDraft(fromCollection(payload.data));
      setCreating(false);
      setNotice(selected ? "Draf galeri diperbarui." : "Draf galeri dibuat.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Galeri gagal disimpan");
    } finally {
      setBusy(false);
    }
  }

  async function transition(next: Status) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/bff/media-collections/${selected.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected_version: selected.version, status: next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(responseError(response.status));
      setSelected(payload.data);
      setDraft(fromCollection(payload.data));
      setNotice(`Status menjadi ${labels[next]}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transisi gagal");
    } finally {
      setBusy(false);
    }
  }

  const actions = useMemo(() => {
    const result: Status[] = [];
    if (selected?.status === "draft" && canWrite) result.push("in_review");
    if (selected?.status === "in_review" && canReview) result.push("draft", "approved");
    if (selected?.status === "approved" && canReview) result.push("draft", "published");
    if (selected?.status === "published" && (canWrite || canReview)) result.push("archived");
    return result;
  }, [selected, canWrite, canReview]);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Kurasi Media Publik</p>
          <h1 className="admin-page-title">Galeri Media & Video Hub</h1>
          <p className="admin-page-copy">
            Susun aset aktif menjadi koleksi publik tanpa mengekspos storage mentah.
          </p>
        </div>
        {canWrite ? (
          <button className="admin-button" type="button" onClick={startCreate}>
            <AdminIcon name="plus" className="h-4 w-4 mr-2 inline-block" />
            Koleksi baru
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="admin-alert-error mb-5" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          className="mb-5 rounded-xl border border-sky-300 bg-sky-50 dark:bg-sky-950/40 p-4 text-sm font-bold text-sky-900 dark:text-sky-200"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="admin-card self-start">
          <div className="admin-card-header border-b border-slate-100 dark:border-slate-800 p-4">
            <h2 className="font-black text-slate-900 dark:text-white">Daftar Koleksi</h2>
          </div>
          <div className="admin-card-body p-4">
            <label className="admin-label" htmlFor="gallery-search">
              Cari koleksi
            </label>
            <div className="relative">
              <AdminIcon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="gallery-search"
                className="admin-input !pl-9"
                maxLength={100}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Judul atau kata kunci..."
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                aria-label="Jenis koleksi"
                className="admin-input"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua jenis</option>
                {Object.entries(kindLabels).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
              <select
                aria-label="Status koleksi"
                className="admin-input"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua status</option>
                {Object.entries(labels).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 grid gap-2">
              {loading ? (
                <p role="status" className="text-sm text-slate-500 py-4 text-center">
                  Memuat koleksi…
                </p>
              ) : items.length === 0 ? (
                <p className="admin-empty py-6 text-center text-sm text-slate-500">
                  Belum ada koleksi.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => choose(item)}
                    className={`admin-list-item text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition flex items-center justify-between gap-3 ${
                      selected?.id === item.id
                        ? "is-active bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-slate-900 dark:text-white truncate">
                        {item.title}
                      </strong>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {kindLabels[item.kind]} · {item.items.length} item
                      </span>
                    </span>
                    <span className={`cuba-badge shrink-0 ${statusBadgeClasses[item.status]}`}>
                      {labels[item.status]}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <AdminClientPagination
                page={page}
                pages={totalPages}
                total={items.length}
                pageSize={12}
                onPageChange={setPage}
              />
            </div>
          </div>
        </aside>

        <main>
          {!selected && !creating ? (
            <div className="admin-empty rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <AdminIcon name="media" className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Pilih atau buat koleksi
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pilih salah satu koleksi di samping atau klik tombol Koleksi Baru.
              </p>
            </div>
          ) : (
            <form className="admin-form-card" onSubmit={save}>
              <div className="admin-form-header flex items-center justify-between">
                <div>
                  <p className="admin-kicker">Kurasi koleksi</p>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selected?.title || "Koleksi baru"}
                  </h2>
                </div>
                {selected ? (
                  <span className={`cuba-badge ${statusBadgeClasses[selected.status]}`}>
                    {labels[selected.status]}
                  </span>
                ) : null}
              </div>

              <fieldset className="admin-form-body" disabled={!editable || busy}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="admin-label" htmlFor="gallery-title">
                      Judul *
                    </label>
                    <input
                      id="gallery-title"
                      className="admin-input"
                      required
                      minLength={3}
                      maxLength={200}
                      value={draft.title}
                      onChange={(event) => {
                        set("title", event.target.value);
                        if (!selected) set("slug", slugify(event.target.value));
                      }}
                    />
                  </div>
                  <div>
                    <label className="admin-label" htmlFor="gallery-slug">
                      Slug *
                    </label>
                    <input
                      id="gallery-slug"
                      className="admin-input"
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      maxLength={160}
                      value={draft.slug}
                      onChange={(event) => set("slug", event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-label" htmlFor="gallery-summary">
                    Ringkasan *
                  </label>
                  <textarea
                    id="gallery-summary"
                    className="admin-input"
                    required
                    minLength={10}
                    maxLength={1000}
                    rows={3}
                    value={draft.summary}
                    onChange={(event) => set("summary", event.target.value)}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="admin-label" htmlFor="gallery-kind">
                      Jenis *
                    </label>
                    <select
                      id="gallery-kind"
                      className="admin-input"
                      value={draft.kind}
                      onChange={(event) => {
                        set("kind", event.target.value as Kind);
                        set("items", []);
                      }}
                    >
                      {Object.entries(kindLabels).map(([val, lbl]) => (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 self-end text-sm font-bold text-slate-700 dark:text-slate-300 pb-2">
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={draft.featured}
                      onChange={(event) => set("featured", event.target.checked)}
                    />
                    Koleksi unggulan
                  </label>
                </div>

                <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">Item terkurasi</h3>
                      <p className="text-xs text-slate-500">
                        Urutan deterministik; satu item dapat dijadikan cover.
                      </p>
                    </div>
                    <MediaPicker
                      imageOnly={draft.kind === "image_gallery"}
                      videoOnly={draft.kind === "video_hub"}
                      buttonLabel={draft.kind === "image_gallery" ? "Tambah gambar" : "Tambah video"}
                      onSelect={addMedia}
                    />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {draft.items.length === 0 ? (
                      <p className="admin-empty py-4 text-center text-sm text-slate-500">
                        Belum ada item media dalam koleksi.
                      </p>
                    ) : (
                      draft.items.map((item, index) => (
                        <article
                          key={item.media_id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm font-bold text-slate-900 dark:text-white">
                              {index + 1}. {item.display_filename || item.media_id.slice(0, 8)}
                            </strong>
                            <div className="flex gap-1.5">
                              <button
                                className="admin-button-secondary !py-1 !px-2.5 !text-xs"
                                type="button"
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                              >
                                ↑ Naik
                              </button>
                              <button
                                className="admin-button-secondary !py-1 !px-2.5 !text-xs"
                                type="button"
                                disabled={index === draft.items.length - 1}
                                onClick={() => move(index, 1)}
                              >
                                ↓ Turun
                              </button>
                              <button
                                className="admin-button-secondary !py-1 !px-2.5 !text-xs"
                                type="button"
                                onClick={() => feature(index)}
                              >
                                {item.featured ? "★ Cover" : "Jadikan cover"}
                              </button>
                              <button
                                className="admin-button-secondary !py-1 !px-2.5 !text-xs !text-rose-600 hover:!border-rose-300"
                                type="button"
                                onClick={() => removeItem(index)}
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3">
                            <label className="admin-label">
                              Caption
                              <textarea
                                className="admin-input mt-1"
                                maxLength={2000}
                                rows={2}
                                value={item.caption || ""}
                                onChange={(event) =>
                                  updateItem(index, { caption: event.target.value })
                                }
                              />
                            </label>
                            {draft.kind === "image_gallery" ? (
                              <>
                                <label className="admin-label">
                                  Teks alternatif
                                  <input
                                    className="admin-input mt-1"
                                    required={!item.decorative}
                                    disabled={item.decorative}
                                    maxLength={255}
                                    value={item.alt_text || ""}
                                    onChange={(event) =>
                                      updateItem(index, { alt_text: event.target.value })
                                    }
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    className="admin-checkbox"
                                    checked={item.decorative}
                                    onChange={(event) =>
                                      updateItem(index, {
                                        decorative: event.target.checked,
                                        alt_text: event.target.checked ? "" : item.alt_text,
                                      })
                                    }
                                  />
                                  Dekoratif (abaikan oleh pembaca layar)
                                </label>
                              </>
                            ) : (
                              <label className="admin-label">
                                Transkrip video *
                                <textarea
                                  className="admin-input mt-1"
                                  required
                                  minLength={1}
                                  maxLength={20000}
                                  rows={5}
                                  value={item.transcript || ""}
                                  onChange={(event) =>
                                    updateItem(index, { transcript: event.target.value })
                                  }
                                />
                              </label>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="font-black text-slate-900 dark:text-white">SEO publik</h3>
                  <div className="mt-3 grid gap-3">
                    <label className="admin-label">
                      Judul SEO
                      <input
                        className="admin-input mt-1"
                        maxLength={70}
                        value={draft.seo_title || ""}
                        onChange={(event) => set("seo_title", event.target.value)}
                      />
                    </label>
                    <label className="admin-label">
                      Deskripsi SEO
                      <textarea
                        className="admin-input mt-1"
                        maxLength={160}
                        rows={2}
                        value={draft.seo_description || ""}
                        onChange={(event) => set("seo_description", event.target.value)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={draft.indexable}
                        onChange={(event) => set("indexable", event.target.checked)}
                      />
                      Izinkan indeks mesin pencari
                    </label>
                  </div>
                </section>
              </fieldset>

              <div className="admin-form-footer flex flex-wrap gap-2 justify-end">
                {editable ? (
                  <button className="admin-button" disabled={busy}>
                    {busy ? "Menyimpan…" : "Simpan draf"}
                  </button>
                ) : null}
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="admin-button-secondary"
                    disabled={busy}
                    onClick={() => void transition(action)}
                  >
                    {labels[action]}
                  </button>
                ))}
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
