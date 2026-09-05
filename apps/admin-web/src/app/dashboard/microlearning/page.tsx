"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMicrolearningAction,
  getMicrolearningWorkspaceAction,
  transitionMicrolearningAction,
  updateMicrolearningAction,
  type MicrolearningInput,
  type MicrolearningItem,
  type MicrolearningStatus,
} from "@/app/actions/microlearning";
import { AdminIcon } from "@/components/admin-icon";
import MediaPicker from "@/components/media/MediaPicker";

type Draft = Omit<MicrolearningInput, "expected_version">;

const emptyDraft: Draft = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  format: "quick",
  duration_minutes: 5,
  video_url: "",
  featured_media_id: "",
  related_ids: [],
  seo_title: "",
  seo_description: "",
  indexable: true,
};

const labels: Record<MicrolearningStatus, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

const microStatusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

const formatLabels = {
  quick: "Pembelajaran Cepat",
  article: "Artikel Ringkas",
  video: "Video Interaktif",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const draftFrom = (x: MicrolearningItem): Draft => ({
  slug: x.slug,
  title: x.title,
  summary: x.summary,
  body: x.body,
  format: x.format,
  duration_minutes: x.duration_minutes,
  video_url: x.video_url || "",
  featured_media_id: x.featured_media_id || "",
  related_ids: x.related.map((item) => item.id),
  seo_title: x.seo_title || "",
  seo_description: x.seo_description || "",
  indexable: x.indexable,
});

export default function MicrolearningAdminPage() {
  const [items, setItems] = useState<MicrolearningItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<MicrolearningItem | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("");

  const canWrite = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );
  const canReview = roles.some((role) =>
    ["Portal Administrator", "Reviewer"].includes(role)
  );

  const load = useCallback(async () => {
    const result = await getMicrolearningWorkspaceAction({
      q: query,
      status,
      format,
    });
    setLoading(false);
    setRoles(result.roles);
    if (!result.success) {
      setError(result.error);
      setItems([]);
      return;
    }
    setItems(result.items);
    setError("");
  }, [query, status, format]);

  useEffect(() => {
    let active = true;
    void getMicrolearningWorkspaceAction({ q: query, status, format }).then(
      (result) => {
        if (!active) return;
        setLoading(false);
        setRoles(result.roles);
        if (!result.success) {
          setError(result.error);
          setItems([]);
          return;
        }
        setItems(result.items);
        setError("");
      }
    );
    return () => {
      active = false;
    };
  }, [query, status, format]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const choose = (item: MicrolearningItem) => {
    setSelected(item);
    setDraft(draftFrom(item));
    setCreating(false);
    setError("");
    setNotice("");
  };

  const startCreate = () => {
    setSelected(null);
    setDraft(emptyDraft);
    setCreating(true);
    setError("");
    setNotice("");
  };

  const editable = canWrite && (!selected || selected.status === "draft");
  const relatedOptions = useMemo(
    () =>
      items.filter(
        (item) => item.id !== selected?.id && item.status !== "archived"
      ),
    [items, selected]
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const input: MicrolearningInput = {
      ...draft,
      video_url: draft.format === "video" ? draft.video_url : "",
      expected_version: selected?.version,
    };
    const result = selected
      ? await updateMicrolearningAction(selected.id, input)
      : await createMicrolearningAction(input);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setCreating(false);
    setNotice(
      selected
        ? "Materi berhasil diperbarui."
        : "Draf materi berhasil dibuat."
    );
    await load();
  }

  async function transition(next: MicrolearningStatus) {
    if (!selected) return;
    setBusy(true);
    const result = await transitionMicrolearningAction(selected.id, next);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setNotice(`Materi dipindahkan ke ${labels[next]}.`);
    await load();
  }

  const actions: Array<{ status: MicrolearningStatus; label: string }> = [];
  if (selected?.status === "draft" && canWrite)
    actions.push({ status: "in_review", label: "Ajukan peninjauan" });
  if (selected?.status === "in_review" && canReview)
    actions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "approved", label: "Setujui" }
    );
  if (selected?.status === "approved" && canReview)
    actions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "published", label: "Terbitkan" }
    );
  if (selected?.status === "published" && (canWrite || canReview))
    actions.push({ status: "archived", label: "Arsipkan" });

  return (
    <div className="admin-page space-y-6">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Materi Pembelajaran Mandiri</p>
          <h1 className="admin-page-title">Pembelajaran Singkat</h1>
          <p className="admin-page-copy">
            Kelola materi 3–15 menit. Progresnya ringan dan tidak menjadi completion Moodle.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="admin-button flex items-center gap-2"
            onClick={startCreate}
          >
            <AdminIcon name="file" className="h-4 w-4" />
            Materi baru
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm font-bold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
        >
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        {/* Left: Materials Directory */}
        <aside className="admin-card self-start overflow-hidden">
          <div className="admin-card-header border-b border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Daftar Materi
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Materi pembelajaran singkat mandiri terdaftar.
            </p>
          </div>
          <div className="admin-card-body p-5 space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="micro-search" className="admin-label">
                  Cari Materi
                </label>
                <input
                  id="micro-search"
                  className="admin-input mt-1"
                  value={query}
                  maxLength={100}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Judul materi..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="micro-status-filter" className="admin-label text-[11px]">
                    Status
                  </label>
                  <select
                    id="micro-status-filter"
                    aria-label="Status"
                    className="admin-input mt-1 text-xs"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">Semua status</option>
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="micro-format-filter" className="admin-label text-[11px]">
                    Format
                  </label>
                  <select
                    id="micro-format-filter"
                    aria-label="Format"
                    className="admin-input mt-1 text-xs"
                    value={format}
                    onChange={(event) => setFormat(event.target.value)}
                  >
                    <option value="">Semua format</option>
                    {Object.entries(formatLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {loading ? (
                <p role="status" className="py-4 text-center text-sm text-slate-500">
                  Memuat materi…
                </p>
              ) : items.length === 0 ? (
                <p className="admin-empty py-6 text-center text-xs text-slate-500">
                  Belum ada materi pada filter ini.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => choose(item)}
                    className={`admin-list-item w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      selected?.id === item.id
                        ? "is-active border-sky-500 bg-sky-50/60 dark:bg-sky-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {formatLabels[item.format]} · {item.duration_minutes} menit
                      </span>
                    </div>
                    <span
                      className={`cuba-badge shrink-0 text-[10px] ${
                        microStatusBadgeClasses[item.status] ||
                        "cuba-badge-neutral"
                      }`}
                    >
                      {labels[item.status]}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Right: Workspace & Editor */}
        <main className="space-y-6">
          {!selected && !creating ? (
            <div className="admin-empty rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="admin-stat-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                <AdminIcon name="knowledge" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Pilih materi untuk ditinjau
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Pilih materi dari panel sebelah kiri atau klik tombol Materi Baru di kanan atas untuk mulai menulis.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {/* Form Card 1: Informasi Utama */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                      {selected ? "Detail Materi" : "Materi Baru"}
                    </p>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {selected?.title || "Susun microlearning"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Materi pembelajaran fokus dengan durasi 3–15 menit.
                    </p>
                  </div>
                  {selected && (
                    <span
                      className={`cuba-badge self-start sm:self-center ${
                        microStatusBadgeClasses[selected.status] ||
                        "cuba-badge-neutral"
                      }`}
                    >
                      {labels[selected.status]}
                    </span>
                  )}
                </div>

                <fieldset disabled={!editable || busy} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor="micro-title" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Judul Materi *
                      </label>
                      <input
                        id="micro-title"
                        required
                        minLength={3}
                        maxLength={200}
                        className="admin-input mt-2"
                        value={draft.title}
                        onChange={(event) => {
                          set("title", event.target.value);
                          if (!selected) set("slug", slugify(event.target.value));
                        }}
                        placeholder="Contoh: Dasar Pemrosesan Pipeline Streaming"
                      />
                    </div>
                    <div>
                      <label htmlFor="micro-slug" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Slug URL *
                      </label>
                      <input
                        id="micro-slug"
                        required
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        maxLength={160}
                        className="admin-input mt-2"
                        value={draft.slug}
                        onChange={(event) => set("slug", event.target.value)}
                        placeholder="dasar-pemrosesan-pipeline-streaming"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="micro-summary" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Ringkasan Singkat *
                    </label>
                    <textarea
                      id="micro-summary"
                      required
                      minLength={10}
                      maxLength={500}
                      rows={3}
                      className="admin-input mt-2"
                      value={draft.summary}
                      onChange={(event) => set("summary", event.target.value)}
                      placeholder="Jelaskan ringkasan materi secara singkat dan padat..."
                    />
                  </div>

                  <div>
                    <label htmlFor="micro-body" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Isi editorial *
                    </label>
                    <textarea
                      id="micro-body"
                      required
                      minLength={20}
                      maxLength={20000}
                      rows={8}
                      className="admin-input mt-2 font-mono text-xs"
                      value={draft.body}
                      onChange={(event) => set("body", event.target.value)}
                      placeholder="Tuliskan naskah atau panduan pembelajaran singkat di sini..."
                    />
                  </div>

                  {/* Format & Durasi */}
                  <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label htmlFor="micro-format" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Format Materi *
                      </label>
                      <select
                        id="micro-format"
                        className="admin-input mt-2"
                        value={draft.format}
                        onChange={(event) =>
                          set("format", event.target.value as Draft["format"])
                        }
                      >
                        {Object.entries(formatLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="micro-duration" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Estimasi Durasi (3–15 menit) *
                      </label>
                      <input
                        id="micro-duration"
                        type="number"
                        min={3}
                        max={15}
                        required
                        className="admin-input mt-2"
                        value={draft.duration_minutes}
                        onChange={(event) =>
                          set("duration_minutes", Number(event.target.value))
                        }
                      />
                    </div>
                  </div>

                  {draft.format === "video" && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20 p-4">
                      <label htmlFor="micro-video" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        URL video HTTPS *
                      </label>
                      <input
                        id="micro-video"
                        type="url"
                        required
                        pattern="https://.*"
                        maxLength={2048}
                        className="admin-input mt-2"
                        value={draft.video_url}
                        onChange={(event) => set("video_url", event.target.value)}
                        placeholder="https://..."
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Video memakai sumber HTTPS terkurasi. Policy upload Media tetap gambar/PDF.
                      </p>
                    </div>
                  )}
                </fieldset>
              </div>

              {/* Form Card 2: Cover dari Pustaka Media */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Cover dari Pustaka Media
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Hanya aset gambar aktif dari policy endpoint.
                  </p>
                </div>
                <fieldset disabled={!editable || busy} className="space-y-4 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <MediaPicker imageOnly buttonLabel="Pilih cover" onSelect={(media) => set("featured_media_id", media.id)} />
                    {draft.featured_media_id ? (
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          Aset #{draft.featured_media_id.slice(0, 8)}…
                        </span>
                        <button
                          type="button"
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          onClick={() => set("featured_media_id", "")}
                        >
                          Hapus cover
                        </button>
                      </div>
                    ) : null}
                  </div>
                </fieldset>
              </div>

              {/* Form Card 3: Materi terkait */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Materi terkait
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Maksimal delapan materi; hanya materi terbit tampil di Portal.
                  </p>
                </div>
                <fieldset disabled={!editable || busy} className="space-y-3 pt-1">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {relatedOptions.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                          draft.related_ids.includes(item.id)
                            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="cuba-checkbox mt-0.5 rounded text-sky-600"
                          checked={draft.related_ids.includes(item.id)}
                          disabled={
                            !draft.related_ids.includes(item.id) &&
                            draft.related_ids.length >= 8
                          }
                          onChange={(event) =>
                            set(
                              "related_ids",
                              event.target.checked
                                ? [...draft.related_ids, item.id]
                                : draft.related_ids.filter((id) => id !== item.id)
                            )
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </strong>
                          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                            {labels[item.status]}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Form Card 4: SEO publik */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    SEO publik
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Konfigurasi metadata untuk pengindeksan mesin pencari.
                  </p>
                </div>
                <fieldset disabled={!editable || busy} className="space-y-4 pt-1">
                  <div>
                    <label htmlFor="micro-seo-title" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Judul SEO
                    </label>
                    <input
                      id="micro-seo-title"
                      maxLength={70}
                      className="admin-input mt-2"
                      value={draft.seo_title}
                      onChange={(event) => set("seo_title", event.target.value)}
                      placeholder={draft.title || "Mengikuti judul materi"}
                    />
                  </div>
                  <div>
                    <label htmlFor="micro-seo-description" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Deskripsi SEO
                    </label>
                    <textarea
                      id="micro-seo-description"
                      maxLength={160}
                      rows={3}
                      className="admin-input mt-2"
                      value={draft.seo_description}
                      onChange={(event) => set("seo_description", event.target.value)}
                      placeholder="Ringkasan untuk ditampilkan pada hasil pencarian..."
                    />
                  </div>
                  <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      className="cuba-checkbox rounded text-sky-600"
                      checked={draft.indexable}
                      onChange={(event) => set("indexable", event.target.checked)}
                    />
                    Izinkan indeks pencarian dan mesin pencari
                  </label>
                </fieldset>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className="admin-button-secondary"
                      disabled={busy}
                      onClick={() => transition(action.status)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="admin-button-secondary"
                    onClick={() => {
                      setSelected(null);
                      setCreating(false);
                    }}
                  >
                    Tutup
                  </button>
                  {editable ? (
                    <button className="admin-button" disabled={busy}>
                      {busy ? "Menyimpan…" : "Simpan draf"}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Hanya draf yang dapat diedit.
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
