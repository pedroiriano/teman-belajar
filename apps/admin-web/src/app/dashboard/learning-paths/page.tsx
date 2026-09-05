"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import {
  createLearningPathAction,
  createLearningPathRevisionAction,
  getLearningPathWorkspaceAction,
  transitionLearningPathAction,
  updateLearningPathAction,
  type LearningPath,
  type LearningPathInput,
  type LearningPathItemInput,
  type LearningPathOption,
  type LearningPathStatus,
} from "@/app/actions/learning-paths";

type Draft = Omit<LearningPathInput, "expected_row_version">;

const empty: Draft = {
  slug: "",
  title: "",
  summary: "",
  description: "",
  items: [],
};

const labels: Record<LearningPathStatus, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

const pathStatusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

const kinds = {
  course: "Course Moodle",
  knowledge: "Pengetahuan",
  microlearning: "Pembelajaran Singkat",
  webinar: "Webinar",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const draftFrom = (path: LearningPath): Draft => ({
  slug: path.slug,
  title: path.version.title,
  summary: path.version.summary,
  description: path.version.description,
  items: path.version.items.map(
    ({
      key,
      kind,
      source_ref,
      label,
      summary,
      required,
      milestone,
      prerequisite_keys,
    }) => ({
      key,
      kind,
      source_ref,
      label,
      summary: summary || "",
      required,
      milestone,
      prerequisite_keys,
    })
  ),
});

export default function LearningPathsAdminPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [options, setOptions] = useState<LearningPathOption[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [provenance, setProvenance] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<LearningPath | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [webinarID, setWebinarID] = useState("");
  const [webinarLabel, setWebinarLabel] = useState("");

  const canWrite = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );
  const canReview = roles.some((role) =>
    ["Portal Administrator", "Reviewer"].includes(role)
  );

  const load = useCallback(async () => {
    const result = await getLearningPathWorkspaceAction({ q: query, status });
    setLoading(false);
    setRoles(result.roles);
    setOptions(result.options);
    setProvenance(result.provenance);
    if (!result.success) {
      setError(result.error);
      setPaths([]);
      return;
    }
    setPaths(result.paths);
    setError("");
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const choose = (path: LearningPath) => {
    setSelected(path);
    setDraft(draftFrom(path));
    setCreating(false);
    setError("");
    setNotice("");
  };

  const editable = canWrite && (!selected || selected.version.status === "draft");
  const used = useMemo(
    () => new Set(draft.items.map((item) => `${item.kind}:${item.source_ref}`)),
    [draft.items]
  );

  const add = (option: LearningPathOption) => {
    const keyBase =
      slugify(`${option.kind}-${option.label}`).slice(0, 70) ||
      `item-${draft.items.length + 1}`;
    let key = keyBase;
    let suffix = 2;
    while (draft.items.some((item) => item.key === key)) {
      key = `${keyBase}-${suffix++}`;
    }
    set("items", [
      ...draft.items,
      {
        key,
        kind: option.kind,
        source_ref: option.source_ref,
        label: option.label,
        summary: option.summary || "",
        required: option.kind !== "webinar",
        milestone: false,
        prerequisite_keys: [],
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<LearningPathItemInput>) =>
    set(
      "items",
      draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    const next = [...draft.items];
    [next[index], next[target]] = [next[target], next[index]];
    set("items", next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const input: LearningPathInput = {
      ...draft,
      expected_row_version: selected?.row_version,
    };
    const result = selected
      ? await updateLearningPathAction(selected.id, input)
      : await createLearningPathAction(input);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setCreating(false);
    setNotice("Draf Jalur Belajar tersimpan.");
    await load();
  };

  const transition = async (next: LearningPathStatus) => {
    if (!selected) return;
    setBusy(true);
    const result = await transitionLearningPathAction(selected.id, next);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setNotice(`Status diubah menjadi ${labels[next]}.`);
    await load();
  };

  const revision = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await createLearningPathRevisionAction(
      selected.id,
      selected.row_version
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setNotice(
      `Versi ${result.data.version.number} dibuat tanpa mengubah versi terbit learner lama.`
    );
    await load();
  };

  const actions: Array<{ status: LearningPathStatus; label: string }> = [];
  if (selected?.version.status === "draft" && canWrite)
    actions.push({ status: "in_review", label: "Ajukan peninjauan" });
  if (selected?.version.status === "in_review" && canReview)
    actions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "approved", label: "Setujui" }
    );
  if (selected?.version.status === "approved" && canReview)
    actions.push(
      { status: "draft", label: "Kembalikan ke draf" },
      { status: "published", label: "Terbitkan" }
    );
  if (selected?.version.status === "published" && (canWrite || canReview))
    actions.push({ status: "archived", label: "Arsipkan" });

  return (
    <div className="admin-page space-y-6">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Komposisi Bertahap</p>
          <h1 className="admin-page-title">Jalur Belajar</h1>
          <p className="admin-page-copy">
            Susun pengalaman bertahap dengan prerequisite, milestone, provenance, dan versi terbit yang stabil.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="admin-button flex items-center gap-2"
            onClick={() => {
              setSelected(null);
              setDraft(empty);
              setCreating(true);
              setError("");
              setNotice("");
            }}
          >
            <AdminIcon name="file" className="h-4 w-4" />
            Jalur baru
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

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Left: Learning Paths Directory */}
        <aside className="admin-card self-start overflow-hidden">
          <div className="admin-card-header border-b border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Daftar Jalur Belajar
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Katalog kurikulum bertahap.
            </p>
          </div>
          <div className="admin-card-body p-5 space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="path-search" className="admin-label">
                  Cari Jalur
                </label>
                <input
                  id="path-search"
                  className="admin-input mt-1"
                  value={query}
                  maxLength={100}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Judul kurikulum..."
                />
              </div>
              <div>
                <label htmlFor="path-status" className="admin-label">
                  Status
                </label>
                <select
                  id="path-status"
                  className="admin-input mt-1"
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
            </div>

            <div className="space-y-2 pt-2">
              {loading ? (
                <p role="status" className="py-4 text-center text-sm text-slate-500">
                  Memuat…
                </p>
              ) : paths.length === 0 ? (
                <p className="admin-empty py-6 text-center text-xs text-slate-500">
                  Belum ada jalur.
                </p>
              ) : (
                paths.map((path) => (
                  <button
                    type="button"
                    key={path.id}
                    className={`admin-list-item w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      selected?.id === path.id
                        ? "is-active border-sky-500 bg-sky-50/60 dark:bg-sky-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                    onClick={() => choose(path)}
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                        {path.version.title}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        v{path.version.number} · {path.version.items.length} langkah
                      </span>
                    </div>
                    <span
                      className={`cuba-badge shrink-0 text-[10px] ${
                        pathStatusBadgeClasses[path.version.status] ||
                        "cuba-badge-neutral"
                      }`}
                    >
                      {labels[path.version.status]}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Right: Path Composer */}
        <main className="space-y-6">
          {!selected && !creating ? (
            <div className="admin-empty rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="admin-stat-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                <AdminIcon name="book" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Pilih atau buat Jalur Belajar
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Versi terbit tidak akan ditimpa oleh revisi baru, menjaga konsistensi progres peserta.
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-6">
                {/* Form Card 1: Informasi Utama */}
                <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                        {selected ? `Versi ${selected.version.number}` : "Jalur Baru"}
                      </p>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {selected?.version.title || "Komposer jalur"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Susun pengalaman bertahap dengan langkah pembelajaran terarah.
                      </p>
                    </div>
                    {selected && (
                      <span
                        className={`cuba-badge self-start sm:self-center ${
                          pathStatusBadgeClasses[selected.version.status] ||
                          "cuba-badge-neutral"
                        }`}
                      >
                        {labels[selected.version.status]}
                      </span>
                    )}
                  </div>

                  <fieldset disabled={!editable || busy} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label htmlFor="path-title" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                          Judul Jalur *
                        </label>
                        <input
                          id="path-title"
                          required
                          minLength={3}
                          maxLength={200}
                          className="admin-input mt-2"
                          value={draft.title}
                          onChange={(event) => {
                            set("title", event.target.value);
                            if (!selected) set("slug", slugify(event.target.value));
                          }}
                          placeholder="Contoh: Arsitektur Cloud & Keamanan Siber"
                        />
                      </div>
                      <div>
                        <label htmlFor="path-slug" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                          Slug URL *
                        </label>
                        <input
                          id="path-slug"
                          required
                          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                          maxLength={160}
                          className="admin-input mt-2"
                          value={draft.slug}
                          onChange={(event) => set("slug", event.target.value)}
                          placeholder="arsitektur-cloud-keamanan-siber"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="path-summary" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Ringkasan Jalur *
                      </label>
                      <textarea
                        id="path-summary"
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={3}
                        className="admin-input mt-2"
                        value={draft.summary}
                        onChange={(event) => set("summary", event.target.value)}
                        placeholder="Ringkasan kompetensi yang akan dicapai peserta..."
                      />
                    </div>

                    <div>
                      <label htmlFor="path-description" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Deskripsi Lengkap *
                      </label>
                      <textarea
                        id="path-description"
                        required
                        minLength={20}
                        maxLength={20000}
                        rows={5}
                        className="admin-input mt-2"
                        value={draft.description}
                        onChange={(event) => set("description", event.target.value)}
                        placeholder="Penjelasan tahapan pembelajaran, target penguasaan, dan capaian akhir..."
                      />
                    </div>
                  </fieldset>
                </div>

                {/* Form Card 2: Urutan pembelajaran & Prerequisite */}
                <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                  <section aria-labelledby="path-composition">
                    <div className="mb-4 flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 id="path-composition" className="text-base font-extrabold text-slate-900 dark:text-white">
                          Urutan pembelajaran *
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Prerequisite hanya dapat menunjuk langkah lain dalam versi yang sama.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {draft.items.length}/50 Langkah
                      </span>
                    </div>

                    <fieldset disabled={!editable || busy} className="space-y-4">
                      {draft.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                          Belum ada langkah pembelajaran yang ditambahkan. Gunakan pemilih sumber di bawah.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {draft.items.map((item, index) => (
                            <div
                              key={item.key}
                              className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/40 dark:bg-slate-800/20 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                                <div>
                                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                    {index + 1}. {item.label}
                                  </h4>
                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {kinds[item.kind]} · ID: {item.source_ref}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    aria-label={`Naikkan ${item.label}`}
                                    onClick={() => move(index, -1)}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    aria-label={`Turunkan ${item.label}`}
                                    onClick={() => move(index, 1)}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                    onClick={() =>
                                      set(
                                        "items",
                                        draft.items
                                          .filter((_, i) => i !== index)
                                          .map((x) => ({
                                            ...x,
                                            prerequisite_keys: x.prerequisite_keys.filter(
                                              (key) => key !== item.key
                                            ),
                                          }))
                                      )
                                    }
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 pt-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="cuba-checkbox rounded text-sky-600"
                                    checked={item.required}
                                    disabled={item.kind === "webinar"}
                                    onChange={(event) =>
                                      updateItem(index, { required: event.target.checked })
                                    }
                                  />
                                  Wajib Diselesaikan
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="cuba-checkbox rounded text-sky-600"
                                    checked={item.milestone}
                                    onChange={(event) =>
                                      updateItem(index, { milestone: event.target.checked })
                                    }
                                  />
                                  Capaian Utama (Milestone)
                                </label>
                              </div>

                              <div className="pt-2">
                                <label
                                  htmlFor={`prerequisite-${index}`}
                                  className="admin-label text-xs"
                                >
                                  Prerequisite (Langkah Prasyarat)
                                </label>
                                <select
                                  id={`prerequisite-${index}`}
                                  multiple
                                  className="admin-input mt-1 min-h-20 text-xs"
                                  value={item.prerequisite_keys}
                                  onChange={(event) =>
                                    updateItem(index, {
                                      prerequisite_keys: Array.from(
                                        event.target.selectedOptions,
                                        (opt) => opt.value
                                      ),
                                    })
                                  }
                                >
                                  {draft.items
                                    .filter((_, i) => i !== index)
                                    .map((candidate) => (
                                      <option key={candidate.key} value={candidate.key}>
                                        {candidate.label}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dropdown Tambah Sumber */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <label
                          htmlFor="path-option"
                          className="admin-label font-bold text-slate-800 dark:text-slate-200"
                        >
                          Tambah sumber terbit
                        </label>
                        <select
                          id="path-option"
                          className="admin-input mt-1.5"
                          value=""
                          onChange={(event) => {
                            const option = options.find(
                              (x) => `${x.kind}:${x.source_ref}` === event.target.value
                            );
                            if (option) add(option);
                          }}
                        >
                          <option value="">Pilih sumber materi pembelajaran…</option>
                          {options
                            .filter(
                              (option) =>
                                !used.has(`${option.kind}:${option.source_ref}`)
                            )
                            .map((option) => (
                              <option
                                key={`${option.kind}:${option.source_ref}`}
                                value={`${option.kind}:${option.source_ref}`}
                              >
                                {kinds[option.kind]} · {option.label}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Box Webinar */}
                      <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-5 dark:border-yellow-800/60 dark:bg-yellow-950/20">
                        <p className="text-sm font-black text-yellow-900 dark:text-yellow-200">
                          Integrasi Webinar
                        </p>
                        <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-300">
                          Integrasi webinar menggunakan Zoom Basic, sehingga webinar hanya boleh opsional dan akan tampil unavailable/degraded.
                        </p>
                        <div className="mt-3 grid gap-2.5 sm:grid-cols-[8rem_1fr_auto]">
                          <input
                            aria-label="ID webinar Moodle"
                            inputMode="numeric"
                            className="admin-input"
                            placeholder="ID Webinar"
                            value={webinarID}
                            onChange={(event) =>
                              setWebinarID(event.target.value.replace(/\D/g, ""))
                            }
                          />
                          <input
                            aria-label="Label webinar"
                            className="admin-input"
                            placeholder="Judul sesi webinar"
                            value={webinarLabel}
                            maxLength={200}
                            onChange={(event) => setWebinarLabel(event.target.value)}
                          />
                          <button
                            type="button"
                            className="admin-button-secondary font-bold text-xs"
                            disabled={
                              !webinarID ||
                              webinarLabel.trim().length < 2 ||
                              used.has(`webinar:${webinarID}`)
                            }
                            onClick={() => {
                              add({
                                kind: "webinar",
                                source_ref: webinarID,
                                label: webinarLabel.trim(),
                                state: "degraded",
                              });
                              setWebinarID("");
                              setWebinarLabel("");
                            }}
                          >
                            Tambah opsional
                          </button>
                        </div>
                      </div>
                    </fieldset>
                  </section>
                </div>

                {/* Form Footer */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
                  {editable && (
                    <button
                      type="submit"
                      className="admin-button"
                      disabled={busy || draft.items.length === 0}
                    >
                      {busy
                        ? "Menyimpan…"
                        : selected
                        ? "Simpan perubahan"
                        : "Simpan draf"}
                    </button>
                  )}
                </div>
              </form>

              {/* Section: Alur publikasi & Revisi */}
              {selected && (
                <section className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Alur publikasi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Sumber wajib divalidasi ulang sebelum publikasi untuk memastikan keterkaitan utuh.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={busy}
                        className={
                          action.status === "published"
                            ? "admin-button"
                            : "admin-button-secondary"
                        }
                        onClick={() => void transition(action.status)}
                      >
                        {action.label}
                      </button>
                    ))}
                    {selected.version.status === "published" && canWrite && (
                      <button
                        type="button"
                        disabled={busy}
                        className="admin-button-secondary font-bold"
                        onClick={() => void revision()}
                      >
                        Buat revisi baru
                      </button>
                    )}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] font-mono text-slate-500">
                    Provenance:{" "}
                    {Object.entries(provenance)
                      .map(([key, value]) => `${key}=${value}`)
                      .join(" · ")}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
