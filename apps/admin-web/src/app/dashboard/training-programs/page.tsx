"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import {
  createTrainingProgramAction,
  getTrainingWorkspaceAction,
  transitionTrainingProgramAction,
  updateTrainingProgramAction,
  type TrainingCohortInput,
  type TrainingCourseInput,
  type TrainingCourseOption,
  type TrainingProgram,
  type TrainingProgramInput,
} from "@/app/actions/training-programs";

type Draft = Omit<TrainingProgramInput, "expected_version">;

const emptyDraft: Draft = {
  slug: "",
  title: "",
  summary: "",
  description: "",
  audience: "",
  eligibility_text: "",
  courses: [],
  cohorts: [],
};

const labels: Record<string, string> = {
  draft: "Draf",
  in_review: "Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

const programStatusBadgeClasses: Record<string, string> = {
  published: "cuba-badge-success",
  approved: "cuba-badge-primary",
  in_review: "cuba-badge-warning",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const toInputDate = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const fromInputDate = (value: string) =>
  value ? new Date(value).toISOString() : null;

function draftFrom(item: TrainingProgram): Draft {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    description: item.description,
    audience: item.audience || "",
    eligibility_text: item.eligibility_text || "",
    courses: item.courses.map((course) => ({
      moodle_course_id: course.moodle_course_id,
      required: course.required,
    })),
    cohorts: item.cohorts.map((cohort) => ({
      label: cohort.label,
      starts_at: cohort.starts_at || null,
      ends_at: cohort.ends_at || null,
      enrollment_opens_at: cohort.enrollment_opens_at || null,
      enrollment_closes_at: cohort.enrollment_closes_at || null,
      status: cohort.status,
    })),
  };
}

export default function TrainingProgramsAdminPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [options, setOptions] = useState<TrainingCourseOption[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<TrainingProgram | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const canWrite = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );
  const canReview = roles.some((role) =>
    ["Portal Administrator", "Reviewer"].includes(role)
  );

  const load = useCallback(async () => {
    const result = await getTrainingWorkspaceAction({ q: query, status });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      setPrograms([]);
      setOptions(result.courses);
      setRoles(result.roles);
      return;
    }
    setPrograms(result.programs);
    setOptions(result.courses);
    setRoles(result.roles);
    setError("");
  }, [query, status]);

  useEffect(() => {
    let active = true;
    void getTrainingWorkspaceAction({ q: query, status }).then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        setPrograms([]);
        setOptions(result.courses);
        setRoles(result.roles);
        return;
      }
      setPrograms(result.programs);
      setOptions(result.courses);
      setRoles(result.roles);
      setError("");
    });
    return () => {
      active = false;
    };
  }, [query, status]);

  const choose = (item: TrainingProgram) => {
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

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const editable = canWrite && (!selected || selected.status === "draft");
  const selectedCourseIds = useMemo(
    () => new Set(draft.courses.map((item) => item.moodle_course_id)),
    [draft.courses]
  );

  const addCourse = (course: TrainingCourseOption) =>
    set("courses", [
      ...draft.courses,
      { moodle_course_id: course.id, required: true },
    ]);

  const moveCourse = (index: number, direction: -1 | 1) => {
    const next = [...draft.courses];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("courses", next);
  };

  const updateCohort = (
    index: number,
    key: keyof TrainingCohortInput,
    value: string | null
  ) =>
    set(
      "cohorts",
      draft.cohorts.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const input: TrainingProgramInput = {
      ...draft,
      expected_version: selected?.version,
    };
    const result = selected
      ? await updateTrainingProgramAction(selected.id, input)
      : await createTrainingProgramAction(input);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNotice(
      selected
        ? "Program berhasil diperbarui."
        : "Draf program berhasil dibuat."
    );
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setCreating(false);
    await load();
  };

  const transition = async (next: TrainingProgram["status"]) => {
    if (!selected) return;
    setBusy(true);
    const result = await transitionTrainingProgramAction(selected.id, next);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSelected(result.data);
    setDraft(draftFrom(result.data));
    setNotice(`Program dipindahkan ke ${labels[next]}.`);
    await load();
  };

  const actions: Array<{ status: TrainingProgram["status"]; label: string }> = [];
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
          <p className="admin-kicker">Komposisi Program &amp; Kursus</p>
          <h1 className="admin-page-title">Program Pelatihan</h1>
          <p className="admin-page-copy">
            Susun program, cohort, dan urutan course. Enrolment serta completion tetap dikelola Moodle.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="admin-button flex items-center gap-2"
            onClick={startCreate}
          >
            <AdminIcon name="file" className="h-4 w-4" />
            Program baru
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
        {/* Left: Program Directory */}
        <aside className="admin-card self-start overflow-hidden">
          <div className="admin-card-header border-b border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Daftar Program
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Katalog program pelatihan aktif dan terdaftar.
            </p>
          </div>
          <div className="admin-card-body p-5 space-y-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void load();
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="program-search" className="admin-label">
                  Cari Program
                </label>
                <input
                  id="program-search"
                  className="admin-input mt-1"
                  value={query}
                  maxLength={100}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Judul atau sasaran program..."
                />
              </div>
              <div>
                <label htmlFor="program-status" className="admin-label">
                  Filter Status
                </label>
                <select
                  id="program-status"
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
            </form>

            <div className="space-y-2 pt-2">
              {loading ? (
                <p role="status" className="py-4 text-center text-sm text-slate-500">
                  Memuat program…
                </p>
              ) : programs.length === 0 ? (
                <p className="admin-empty py-6 text-center text-xs text-slate-500">
                  Belum ada program pada filter ini.
                </p>
              ) : (
                programs.map((item) => (
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
                        {item.courses.length} course · {item.cohorts.length} cohort
                      </span>
                    </div>
                    <span
                      className={`cuba-badge shrink-0 text-[10px] ${
                        programStatusBadgeClasses[item.status] ||
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
                Pilih program untuk melihat komposisi
              </h2>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Pilih salah satu program dari daftar sebelah kiri atau buat draf program baru dari katalog course Moodle.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {/* Form Card 1: Header & Metadata Utama */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div>
                    <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                      {selected ? "Detail Program" : "Program Baru"}
                    </p>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {selected?.title || "Susun pengalaman pelatihan"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Publikasi memvalidasi ulang setiap course terhadap Moodle secara otomatis.
                    </p>
                  </div>
                  {selected && (
                    <span
                      className={`cuba-badge self-start sm:self-center ${
                        programStatusBadgeClasses[selected.status] ||
                        "cuba-badge-neutral"
                      }`}
                    >
                      {labels[selected.status]}
                    </span>
                  )}
                </div>

                <fieldset disabled={!editable || busy} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor="program-title" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Judul Program *
                      </label>
                      <input
                        id="program-title"
                        required
                        minLength={3}
                        maxLength={200}
                        className="admin-input mt-2"
                        value={draft.title}
                        onChange={(event) => {
                          set("title", event.target.value);
                          if (!selected) set("slug", slugify(event.target.value));
                        }}
                        placeholder="Contoh: Spesialisasi Rekayasa Data Lanjutan"
                      />
                    </div>
                    <div>
                      <label htmlFor="program-slug" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Slug URL *
                      </label>
                      <input
                        id="program-slug"
                        required
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        maxLength={160}
                        className="admin-input mt-2"
                        value={draft.slug}
                        onChange={(event) => set("slug", event.target.value)}
                        placeholder="contoh-rekayasa-data-lanjutan"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="program-summary" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Ringkasan Singkat *
                    </label>
                    <textarea
                      id="program-summary"
                      required
                      minLength={10}
                      maxLength={500}
                      rows={3}
                      className="admin-input mt-2"
                      value={draft.summary}
                      onChange={(event) => set("summary", event.target.value)}
                      placeholder="Jelaskan intisari program pelatihan dalam 2–3 kalimat..."
                    />
                  </div>

                  <div>
                    <label htmlFor="program-description" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                      Deskripsi Lengkap *
                    </label>
                    <textarea
                      id="program-description"
                      required
                      minLength={20}
                      maxLength={20000}
                      rows={6}
                      className="admin-input mt-2"
                      value={draft.description}
                      onChange={(event) => set("description", event.target.value)}
                      placeholder="Jelaskan silabus, tujuan pembelajaran, dan metodologi program..."
                    />
                  </div>

                  {/* Audience & Eligibility */}
                  <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label htmlFor="program-audience" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Sasaran Peserta
                      </label>
                      <textarea
                        id="program-audience"
                        maxLength={500}
                        rows={3}
                        className="admin-input mt-2"
                        value={draft.audience}
                        onChange={(event) => set("audience", event.target.value)}
                        placeholder="Contoh: Analis data pemula hingga menengah..."
                      />
                    </div>
                    <div>
                      <label htmlFor="program-eligibility" className="admin-label font-bold text-slate-800 dark:text-slate-200">
                        Panduan Kelayakan (Eligibility)
                      </label>
                      <textarea
                        id="program-eligibility"
                        maxLength={1000}
                        rows={3}
                        className="admin-input mt-2"
                        value={draft.eligibility_text}
                        onChange={(event) => set("eligibility_text", event.target.value)}
                        placeholder="Prasyarat latar belakang atau sertifikasi sebelum mendaftar..."
                      />
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Copy ini tidak mengonfirmasi akses; CTA publik memakai state API Moodle.
                      </p>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Form Card 2: Komposisi course */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <section>
                  <div className="mb-4 flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Komposisi course *
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Urutan ini menjadi urutan belajar pada Portal.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {draft.courses.length}/50 Kursus
                    </span>
                  </div>

                  <fieldset disabled={!editable || busy} className="space-y-3">
                    {draft.courses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                        Belum ada kursus yang ditambahkan ke komposisi program ini.
                      </div>
                    ) : (
                      draft.courses.map((course, index) => {
                        const option = options.find(
                          (item) => item.id === course.moodle_course_id
                        );
                        return (
                          <div
                            key={course.moodle_course_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 dark:text-white text-sm">
                                {index + 1}. {option?.full_name || `Course #${course.moodle_course_id}`}
                              </p>
                              <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                Moodle ID: {course.moodle_course_id}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="cuba-checkbox rounded text-sky-600"
                                  checked={course.required}
                                  onChange={(event) =>
                                    set(
                                      "courses",
                                      draft.courses.map((item, i) =>
                                        i === index
                                          ? { ...item, required: event.target.checked }
                                          : item
                                      )
                                    )
                                  }
                                />
                                Wajib
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  aria-label={`Naikkan ${option?.full_name || course.moodle_course_id}`}
                                  onClick={() => moveCourse(index, -1)}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  aria-label={`Turunkan ${option?.full_name || course.moodle_course_id}`}
                                  onClick={() => moveCourse(index, 1)}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                  onClick={() =>
                                    set(
                                      "courses",
                                      draft.courses.filter((_, i) => i !== index)
                                    )
                                  }
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {editable && (
                      <div className="pt-3">
                        <label
                          htmlFor="course-picker"
                          className="admin-label font-bold text-slate-800 dark:text-slate-200"
                        >
                          Tambah dari Katalog Moodle
                        </label>
                        <select
                          id="course-picker"
                          className="admin-input mt-1.5"
                          value=""
                          onChange={(event) => {
                            const option = options.find(
                              (item) => item.id === Number(event.target.value)
                            );
                            if (option) addCourse(option);
                          }}
                        >
                          <option value="">Pilih course Moodle untuk ditambahkan…</option>
                          {options
                            .filter((item) => !selectedCourseIds.has(item.id))
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.full_name} ({option.short_name})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </fieldset>
                </section>
              </div>

              {/* Form Card 3: Cohort dan jadwal */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <section>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Cohort dan jadwal
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Waktu ditampilkan pada Portal dengan zona Asia/Jakarta.
                      </p>
                    </div>
                    {editable && (
                      <button
                        type="button"
                        className="admin-button-secondary text-xs font-bold"
                        onClick={() =>
                          set("cohorts", [
                            ...draft.cohorts,
                            {
                              label: "",
                              starts_at: null,
                              ends_at: null,
                              enrollment_opens_at: null,
                              enrollment_closes_at: null,
                              status: "scheduled",
                            },
                          ])
                        }
                      >
                        + Tambah Cohort
                      </button>
                    )}
                  </div>

                  <fieldset disabled={!editable || busy} className="space-y-4">
                    {draft.cohorts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                        Belum ada cohort terjadwal untuk program ini.
                      </div>
                    ) : (
                      draft.cohorts.map((cohort, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/40 dark:bg-slate-800/20 space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              Cohort #{index + 1}
                            </span>
                            <button
                              type="button"
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                              onClick={() =>
                                set(
                                  "cohorts",
                                  draft.cohorts.filter((_, i) => i !== index)
                                )
                              }
                            >
                              Hapus Cohort
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label
                                htmlFor={`cohort-label-${index}`}
                                className="admin-label"
                              >
                                Label Cohort *
                              </label>
                              <input
                                id={`cohort-label-${index}`}
                                required
                                maxLength={160}
                                className="admin-input mt-1"
                                value={cohort.label}
                                onChange={(event) =>
                                  updateCohort(index, "label", event.target.value)
                                }
                                placeholder="Contoh: Batch 1 - Gelombang Januari"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`cohort-status-${index}`}
                                className="admin-label"
                              >
                                Status
                              </label>
                              <select
                                id={`cohort-status-${index}`}
                                className="admin-input mt-1"
                                value={cohort.status}
                                onChange={(event) =>
                                  updateCohort(index, "status", event.target.value)
                                }
                              >
                                <option value="scheduled">Terjadwal</option>
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Dibatalkan</option>
                              </select>
                            </div>
                            {(
                              [
                                ["starts_at", "Tanggal Mulai"],
                                ["ends_at", "Tanggal Selesai"],
                                ["enrollment_opens_at", "Pendaftaran Dibuka"],
                                ["enrollment_closes_at", "Pendaftaran Ditutup"],
                              ] as const
                            ).map(([key, fieldLabel]) => (
                              <div key={key}>
                                <label
                                  htmlFor={`${key}-${index}`}
                                  className="admin-label"
                                >
                                  {fieldLabel}
                                </label>
                                <input
                                  id={`${key}-${index}`}
                                  type="datetime-local"
                                  className="admin-input mt-1"
                                  value={toInputDate(cohort[key])}
                                  onChange={(event) =>
                                    updateCohort(
                                      index,
                                      key,
                                      fromInputDate(event.target.value)
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </fieldset>
                </section>
              </div>

              {/* Form Footer Buttons */}
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
                    disabled={busy || draft.courses.length === 0}
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
          )}

          {/* Section: Alur publikasi */}
          {selected && actions.length > 0 && (
            <section className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Alur publikasi
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reviewer mengubah status; penulisan tetap terpisah untuk memastikan integritas konten.
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
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
