"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AdminIcon } from "@/components/admin-icon";
import { AdminDataTable, type ColumnHeader } from "@/components/admin-data-table";

const emptySubscribe = () => () => {};
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

const STANDARD_CATEGORIES = [
  "Aplikasi Perkantoran",
  "Cloud & DevOps",
  "Software Engineering",
  "Data & AI",
  "Keamanan Siber",
  "UI/UX & Desain",
  "Manajemen Proyek",
];

const emptyDraft: Draft = {
  slug: "",
  title: "",
  summary: "",
  description: "",
  audience: "",
  eligibility_text: "",
  category: "Aplikasi Perkantoran",
  level: "Pemula",
  tags: [],
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

const tableHeaders: ColumnHeader[] = [
  { key: "cover", label: "Cover", width: "w-20", align: "center" },
  { key: "title", label: "Program Pelatihan", sortable: true },
  { key: "category", label: "Bidang Keahlian", sortable: true },
  { key: "level", label: "Tingkat", sortable: true, align: "center", width: "w-28" },
  { key: "courses", label: "Kursus", align: "center", width: "w-20" },
  { key: "cohorts", label: "Cohort", align: "center", width: "w-20" },
  { key: "status", label: "Status", sortable: true, align: "center", width: "w-28" },
  { key: "actions", label: "Aksi", align: "right", width: "w-36" },
];

const statusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draf" },
  { value: "in_review", label: "Peninjauan" },
  { value: "approved", label: "Disetujui" },
  { value: "published", label: "Terbit" },
  { value: "archived", label: "Diarsipkan" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const toInputDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  // Convert to Asia/Jakarta (WIB, UTC+7) YYYY-MM-DDTHH:mm
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minute = get("minute");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const fromInputDate = (value: string): string | null => {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  // Ensure we parse input as Asia/Jakarta (WIB = UTC+7)
  const withOffset = trimmed + (trimmed.length === 16 ? ":00+07:00" : "+07:00");
  const date = new Date(withOffset);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatWibPreview = (isoOrInput?: string | null): string | null => {
  if (!isoOrInput) return null;
  let date: Date;
  if (
    isoOrInput.includes("T") &&
    !isoOrInput.includes("Z") &&
    !isoOrInput.includes("+")
  ) {
    date = new Date(isoOrInput + ":00+07:00");
  } else {
    date = new Date(isoOrInput);
  }
  if (Number.isNaN(date.getTime())) return null;
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date) + " WIB"
  );
};

function draftFrom(item: TrainingProgram): Draft {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    description: item.description,
    audience: item.audience || "",
    eligibility_text: item.eligibility_text || "",
    category: item.category || "Umum",
    level: item.level || "Menengah",
    tags: Array.isArray(item.tags) ? item.tags : [],
    courses: (item.courses || []).map((course) => ({
      moodle_course_id: course.moodle_course_id,
      required: course.required,
    })),
    cohorts: (item.cohorts || []).map((cohort) => ({
      id: cohort.id,
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

  // Table sorting & pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };

  // Dynamic Categories & Modal state
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("tb_training_custom_categories");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === "string");
        }
      }
    } catch {
      // ignore storage access errors
    }
    return [];
  });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryModalError, setCategoryModalError] = useState("");
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Lock body & html scroll and handle ESC key when category modal is open
  useEffect(() => {
    if (!isCategoryModalOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isCategoryModalOpen]);

  // Tag Composer state
  const [tagInput, setTagInput] = useState("");

  // Core Information Lock state: locks ID, Nama, and all main info for existing program unless unlocked
  const [unlockCoreInfo, setUnlockCoreInfo] = useState(false);

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
    let initial = draftFrom(item);
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("tb_cohorts_backup_" + item.id);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initial = { ...initial, cohorts: parsed };
            setNotice(
              "Draf perubahan gelombang sebelumnya yang belum tersimpan telah dipulihkan otomatis."
            );
          }
        }
      } catch {
        // ignore
      }
    }
    setDraft(initial);
    setCreating(false);
    setUnlockCoreInfo(false);
    setError("");
    setTagInput("");
  };

  useEffect(() => {
    if (!selected || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        "tb_cohorts_backup_" + selected.id,
        JSON.stringify(draft.cohorts)
      );
    } catch {
      // ignore
    }
  }, [selected, draft.cohorts]);

  const startCreate = () => {
    setSelected(null);
    setDraft(emptyDraft);
    setCreating(true);
    setUnlockCoreInfo(true);
    setError("");
    setNotice("");
    setTagInput("");
  };

  const sortedPrograms = useMemo(() => {
    const list = [...programs];
    if (!sortKey) return list;
    list.sort((a, b) => {
      let valA = "";
      let valB = "";
      if (sortKey === "title") {
        valA = (a.title || "").toLowerCase();
        valB = (b.title || "").toLowerCase();
      } else if (sortKey === "category") {
        valA = (a.category || "").toLowerCase();
        valB = (b.category || "").toLowerCase();
      } else if (sortKey === "level") {
        valA = a.level || "";
        valB = b.level || "";
      } else if (sortKey === "status") {
        valA = a.status || "";
        valB = b.status || "";
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [programs, sortKey, sortDirection]);

  const pagedPrograms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPrograms.slice(start, start + pageSize);
  }, [sortedPrograms, page, pageSize]);

  const scrollToForm = () => {
    setTimeout(() => {
      const el = document.getElementById("program-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleChooseAndScroll = (item: TrainingProgram) => {
    choose(item);
    scrollToForm();
  };

  const handleStartCreateAndScroll = () => {
    startCreate();
    scrollToForm();
  };

  const closeForm = () => {
    setSelected(null);
    setCreating(false);
    setDraft(emptyDraft);
    setUnlockCoreInfo(false);
    setError("");
    setNotice("");
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Cohort/Batch can always be managed on any active program (multi-batch is supported)
  const cohortEditable = canWrite && (!selected || selected.status !== "archived");
  // Core info (ID, Nama, Taksonomi, Prasyarat, Komposisi Kursus) is locked unless explicitly unlocked
  const coreEditable = canWrite && (!selected ? true : selected.status !== "archived" && unlockCoreInfo);
  const selectedCourseIds = useMemo(
    () => new Set((draft.courses || []).map((item) => item.moodle_course_id)),
    [draft.courses]
  );

  // Combine standard, loaded programs, custom categories, and current draft category
  const allCategories = useMemo(() => {
    const setCategory = new Set<string>(STANDARD_CATEGORIES);
    programs.forEach((p) => {
      if (p.category && p.category.trim()) setCategory.add(p.category.trim());
    });
    customCategories.forEach((c) => {
      if (c && c.trim()) setCategory.add(c.trim());
    });
    if (draft.category && draft.category.trim()) {
      setCategory.add(draft.category.trim());
    }
    return Array.from(setCategory).filter(Boolean);
  }, [programs, customCategories, draft.category]);

  const handleOpenCategoryModal = () => {
    setCategoryModalError("");
    setNewCategoryName("");
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || trimmed.length < 2) {
      setCategoryModalError("Nama kategori minimal 2 karakter.");
      return;
    }
    if (trimmed.length > 60) {
      setCategoryModalError("Nama kategori maksimal 60 karakter.");
      return;
    }

    const existing = allCategories.find(
      (cat) => cat.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      set("category", existing);
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      setCategoryModalError("");
      setNotice(`Kategori "${existing}" sudah ada dan langsung dipilih.`);
      return;
    }

    const updated = Array.from(new Set([...customCategories, trimmed]));
    setCustomCategories(updated);
    try {
      localStorage.setItem(
        "tb_training_custom_categories",
        JSON.stringify(updated)
      );
    } catch {
      // ignore storage error
    }

    set("category", trimmed);
    setIsCategoryModalOpen(false);
    setNewCategoryName("");
    setCategoryModalError("");
    setNotice(`Kategori baru "${trimmed}" berhasil ditambahkan dan dipilih.`);
  };

  const handleAddTag = (rawText: string) => {
    const items = rawText
      .split(",")
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean);
    if (items.length === 0) return;

    const currentTags = draft.tags || [];
    const currentLower = new Set(currentTags.map((t) => t.toLowerCase()));
    const toAdd = items.filter((item) => !currentLower.has(item.toLowerCase()));

    if (toAdd.length > 0) {
      set("tags", [...currentTags, ...toAdd]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (index: number) => {
    set("tags", (draft.tags || []).filter((_, i) => i !== index));
  };

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
    setError("");

    // Client-side pre-flight validation for cohorts
    if (draft.cohorts && draft.cohorts.length > 0) {
      for (let i = 0; i < draft.cohorts.length; i++) {
        const c = draft.cohorts[i];
        if (!c.label || !c.label.trim()) {
          const msg = `Nama Gelombang #${i + 1} wajib diisi.`;
          setError(msg);
          setTimeout(() => {
            document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
          return;
        }
        if (c.label.trim().length < 2) {
          const msg = `Nama Gelombang #${i + 1} minimal 2 karakter.`;
          setError(msg);
          setTimeout(() => {
            document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
          return;
        }
        if (c.starts_at && c.ends_at) {
          const start = new Date(c.starts_at).getTime();
          const end = new Date(c.ends_at).getTime();
          if (start >= end) {
            const msg = `Jadwal Gelombang "${c.label}": Tanggal Selesai Pelatihan harus setelah Tanggal Mulai.`;
            setError(msg);
            setTimeout(() => {
              document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
            return;
          }
        }
        if (c.enrollment_opens_at && c.enrollment_closes_at) {
          const open = new Date(c.enrollment_opens_at).getTime();
          const close = new Date(c.enrollment_closes_at).getTime();
          if (open >= close) {
            const msg = `Jadwal Gelombang "${c.label}": Tanggal Pendaftaran Ditutup harus setelah Pendaftaran Dibuka.`;
            setError(msg);
            setTimeout(() => {
              document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
            return;
          }
        }
      }
    }

    setBusy(true);
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
      setTimeout(() => {
        document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    // Success cleanup & notification
    if (selected && typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("tb_cohorts_backup_" + selected.id);
      } catch {
        // ignore
      }
    }
    setNotice(
      selected
        ? "Program dan gelombang berhasil diperbarui."
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
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/course-reviews"
            className="admin-button-secondary text-xs flex items-center gap-2"
          >
            <AdminIcon name="check" className="h-4 w-4" />
            Moderasi Ulasan
          </Link>
          {canWrite && (
            <button
              type="button"
              className="admin-button flex items-center gap-2"
              onClick={handleStartCreateAndScroll}
            >
              <AdminIcon name="plus" className="h-4 w-4" />
              Program baru
            </button>
          )}
        </div>
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

      <div className="space-y-8">
        {/* Top Section: Uniform Cuba Data Table for "Daftar Program" */}
        <section aria-label="Tabel Program Pelatihan">
          <AdminDataTable
            title="Daftar Program"
            description="Katalog program pelatihan aktif dan terdaftar di platform Teman Belajar."
            titleAlign="center"
            itemCount={programs.length}
            headers={tableHeaders}
            searchQuery={query}
            onSearchChange={(val) => {
              setQuery(val);
              setPage(1);
            }}
            searchPlaceholder="Cari judul atau sasaran program..."
            statusFilter={status}
            statusOptions={statusOptions}
            onStatusFilterChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            page={page}
            pageSize={pageSize}
            total={sortedPrograms.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            loading={loading}
            emptyState={
              query || status !== "all"
                ? "Tidak ada program yang sesuai dengan filter pencarian."
                : "Belum ada program pelatihan yang terdaftar."
            }
          >
            {pagedPrograms.map((item) => {
              const isSelected = selected?.id === item.id;
              const courseCount = (item.courses || []).length;
              const cohortCount = (item.cohorts || []).length;

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isSelected
                      ? "bg-sky-50/75 dark:bg-sky-950/40 ring-1 ring-inset ring-sky-500/40"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {/* Cover */}
                  <td className="px-4 py-3 text-center">
                    {item.cover_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-10 w-14 object-cover rounded-md border border-slate-200 dark:border-slate-700 mx-auto shadow-2xs"
                      />
                    ) : (
                      <div className="h-10 w-14 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                        <AdminIcon name="book" className="h-4 w-4" />
                      </div>
                    )}
                  </td>

                  {/* Program Title & Slug */}
                  <td className="px-4 py-3 min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => handleChooseAndScroll(item)}
                      className="text-left group block w-full focus:outline-hidden"
                    >
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 line-clamp-1">
                        /{item.slug}
                      </div>
                    </button>
                  </td>

                  {/* Category / Bidang Keahlian */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-xs text-sky-700 dark:text-sky-300">
                      {item.category}
                    </span>
                  </td>

                  {/* Difficulty Level */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.level}
                    </span>
                  </td>

                  {/* Kursus Count */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {courseCount}
                    </span>
                  </td>

                  {/* Cohort Count */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cohortCount}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      className={`cuba-badge text-[11px] ${
                        programStatusBadgeClasses[item.status] || "cuba-badge-neutral"
                      }`}
                    >
                      {labels[item.status] || item.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChooseAndScroll(item)}
                        className={`admin-button-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1 font-bold ${
                          isSelected ? "!border-sky-500 !text-sky-600 dark:!text-sky-400" : ""
                        }`}
                        title="Kelola komposisi dan draf program"
                      >
                        <AdminIcon name="edit" className="h-3.5 w-3.5" />
                        <span>Kelola</span>
                      </button>
                      {item.status === "published" && (
                        <a
                          href={`http://localhost:3100/training-programs/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-button-secondary !py-1.5 !px-2 text-xs text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300"
                          title="Lihat halaman di Web Publik (Tab baru)"
                        >
                          <AdminIcon name="external" className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminDataTable>
        </section>

        {/* Bottom Section: Workspace Form Isian Program Pelatihan */}
        <section id="program-form" className="scroll-mt-6 space-y-6">
          {!selected && !creating ? (
            <div className="admin-card rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                <AdminIcon name="knowledge" className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
                Form Isian Program Pelatihan
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Pilih salah satu program dari tabel di atas untuk mengubah rincian atau menyusun urutan kursus Moodle, atau buat draf program pelatihan baru.
              </p>
              {canWrite && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleStartCreateAndScroll}
                    className="admin-button inline-flex items-center gap-2 text-xs"
                  >
                    <AdminIcon name="plus" className="h-4 w-4" />
                    <span>Buat Program Baru</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Form Contextual Header Banner */}
              <div className="admin-card rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40 dark:from-sky-950/30 dark:via-slate-900 dark:to-sky-950/20 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="cuba-badge cuba-badge-primary text-[10px] font-bold uppercase tracking-wider">
                      {selected ? "Mode Pengubahan" : "Mode Pembuatan"}
                    </span>
                    {selected && (
                      <span
                        className={`cuba-badge text-[10px] ${
                          programStatusBadgeClasses[selected.status] || "cuba-badge-neutral"
                        }`}
                      >
                        {labels[selected.status] || selected.status}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    {selected ? `Mengubah: ${selected.title}` : "Menyusun Program Pelatihan Baru"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selected ? (
                      <>
                        Versi draf: <span className="font-semibold text-slate-700 dark:text-slate-300">v{selected.version}</span> ·
                        Terakhir diperbarui:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatWibPreview(selected.updated_at) || selected.updated_at}
                        </span>
                      </>
                    ) : (
                      "Lengkapi 4 bagian form di bawah untuk mendaftarkan program pelatihan baru."
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected?.status === "published" && (
                    <a
                      href={`http://localhost:3100/training-programs/${selected.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-button-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
                    >
                      <AdminIcon name="external" className="h-3.5 w-3.5" />
                      <span>Web Publik</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closeForm}
                    className="admin-button-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
                  >
                    <AdminIcon name="close" className="h-3.5 w-3.5" />
                    <span>Tutup Formulir</span>
                  </button>
                </div>
              </div>

              {/* Core Information Lock / Unlock Control Bar */}
              {selected && (
                <div
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
                    unlockCoreInfo
                      ? "border-sky-300 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/40"
                      : "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        unlockCoreInfo
                          ? "bg-sky-500 text-white shadow-xs"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <AdminIcon
                        name={unlockCoreInfo ? "unlock" : "lock"}
                        className="h-5 w-5"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            unlockCoreInfo
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {unlockCoreInfo
                            ? "Informasi Utama: Terbuka untuk Diedit"
                            : "Informasi Utama: Terkunci (Read-Only)"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          • Multi-Batch Selalu Aktif
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {unlockCoreInfo
                          ? "Kunci informasi utama telah dibuka. Anda dapat mengubah ID, Judul, Kategori, Prasyarat, dan Komposisi Kursus Moodle."
                          : "ID, Judul, Kategori, Prasyarat, dan Komposisi Kursus terkunci demi integritas data. Hanya Gelombang/Batch yang dapat ditambah/diubah."}
                      </p>
                    </div>
                  </div>

                  {canWrite && selected.status !== "archived" && (
                    <div className="shrink-0 flex items-center gap-2">
                      {unlockCoreInfo ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUnlockCoreInfo(false);
                            setDraft(draftFrom(selected));
                            setNotice(
                              "Informasi utama dikunci kembali. Perubahan draf informasi utama dibatalkan."
                            );
                          }}
                          className="admin-button-secondary text-xs font-bold flex items-center gap-1.5"
                        >
                          <AdminIcon name="lock" className="h-3.5 w-3.5" />
                          <span>Kunci Kembali Informasi</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUnlockCoreInfo(true);
                            setNotice(
                              "Kunci informasi utama dibuka. Anda dapat mengubah detail dan komposisi program."
                            );
                          }}
                          className="admin-button-secondary !border-sky-500 !text-sky-700 dark:!text-sky-300 hover:!bg-sky-50 dark:hover:!bg-sky-950/50 text-xs font-bold flex items-center gap-1.5"
                        >
                          <AdminIcon name="unlock" className="h-3.5 w-3.5" />
                          <span>Minta Ubah Informasi Utama</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={submit} className="space-y-6">
              {/* Form Card 1: Informasi Dasar Program */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-xs">
                        1
                      </span>
                      <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                        {selected ? "Detail Program" : "Program Baru"}
                      </p>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {selected?.title || "Susun Pengalaman Pelatihan"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Informasi resmi program, ringkasan capaian, dan deskripsi silabus komprehensif.
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

                <fieldset disabled={!coreEditable || busy} className="space-y-5">
                  {/* ID Program (Permanently Locked / System Generated) */}
                  <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="program-id-display"
                        className="admin-label font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <AdminIcon name="lock" className="h-3.5 w-3.5 text-slate-400" />
                        <span>ID Program (UUID)</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {selected ? "Terkunci Sistem" : "Otomatis"}
                      </span>
                    </div>
                    <input
                      id="program-id-display"
                      readOnly
                      disabled
                      className="admin-input font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed border-slate-200 dark:border-slate-700"
                      value={selected?.id || "Dihasilkan otomatis oleh sistem saat disimpan"}
                    />
                    <p className="text-[11px] text-slate-400">
                      ID program bersifat permanen dan tidak dapat diubah setelah dibuat demi menjaga referensi sertifikat &amp; riwayat pendaftaran.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="program-title"
                          className="admin-label font-bold text-slate-800 dark:text-slate-200"
                        >
                          Judul Program *
                        </label>
                        {!coreEditable && selected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <AdminIcon name="lock" className="h-3 w-3" /> Terkunci
                          </span>
                        )}
                      </div>
                      <input
                        id="program-title"
                        required
                        minLength={3}
                        maxLength={200}
                        className="admin-input mt-1.5"
                        value={draft.title}
                        onChange={(event) => {
                          set("title", event.target.value);
                          if (!selected) set("slug", slugify(event.target.value));
                        }}
                        placeholder="Contoh: Pelatihan Microsoft Office Tingkat Dasar"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="program-slug"
                          className="admin-label font-bold text-slate-800 dark:text-slate-200"
                        >
                          Slug URL *
                        </label>
                        {!coreEditable && selected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <AdminIcon name="lock" className="h-3 w-3" /> Terkunci
                          </span>
                        )}
                      </div>
                      <input
                        id="program-slug"
                        required
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        maxLength={160}
                        className="admin-input mt-1.5"
                        value={draft.slug}
                        onChange={(event) => set("slug", event.target.value)}
                        placeholder="contoh-pelatihan-office-dasar"
                      />
                      <p className="mt-1 font-mono text-[11px] text-slate-400 truncate">
                        Akses: /training-programs/{draft.slug || "slug-program"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="program-summary"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Ringkasan Singkat *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {draft.summary.length}/500 karakter
                      </span>
                    </div>
                    <textarea
                      id="program-summary"
                      required
                      minLength={10}
                      maxLength={500}
                      rows={3}
                      className="admin-input mt-1.5 leading-relaxed"
                      value={draft.summary}
                      onChange={(event) => set("summary", event.target.value)}
                      placeholder="Jelaskan intisari kompetensi dan nilai program dalam 2–3 kalimat ringkas..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="program-description"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Deskripsi Lengkap &amp; Silabus *
                      </label>
                      <span className="text-[11px] text-slate-400">Mendukung format Markdown</span>
                    </div>
                    <textarea
                      id="program-description"
                      required
                      minLength={20}
                      maxLength={20000}
                      rows={7}
                      className="admin-input mt-1.5 font-sans leading-relaxed"
                      value={draft.description}
                      onChange={(event) => set("description", event.target.value)}
                      placeholder="Jelaskan silabus materi, tujuan pelatihan, metode belajar, dan hasil kompetensi yang akan dicapai peserta..."
                    />
                  </div>
                </fieldset>
              </div>

              {/* Form Card 2: Klasifikasi & Taksonomi (Bidang Keahlian, Tingkat, & Tag) */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-xs">
                      2
                    </span>
                    <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                      Pengelompokan &amp; Penemuan
                    </p>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    Klasifikasi &amp; Taksonomi Program
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Menentukan bagaimana program ini dikelompokkan, difilter, dan ditemukan oleh peserta di Web Publik.
                  </p>
                </div>

                <fieldset disabled={!coreEditable || busy} className="space-y-6">
                  {/* Bidang Keahlian */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="program-category-select"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Bidang Keahlian (Topik) *
                      </label>
                      {draft.category && (
                        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                          Aktif: {draft.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        id="program-category-select"
                        className="admin-input flex-1"
                        value={draft.category || "Umum"}
                        onChange={(e) => {
                          if (e.target.value === "__ADD_NEW__") {
                            handleOpenCategoryModal();
                          } else {
                            set("category", e.target.value);
                          }
                        }}
                      >
                        <optgroup label="Daftar Kategori Tersedia">
                          {allCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Tindakan Kustom">
                          <option value="__ADD_NEW__" className="font-bold text-sky-600">
                            + Tambah Kategori Baru (Kustom)...
                          </option>
                        </optgroup>
                      </select>
                      <button
                        type="button"
                        onClick={handleOpenCategoryModal}
                        disabled={!coreEditable || busy}
                        className="admin-button-secondary shrink-0 flex items-center gap-2 py-2.5 px-4 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Tambah Kategori Kustom Baru"
                      >
                        <AdminIcon name="plus" className="h-4 w-4" />
                        <span>Kategori Baru</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kategori digunakan sebagai filter utama pengelompokan program pada katalog penjelajah Web Publik.
                    </p>
                  </div>

                  {/* Tingkat Kesulitan */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="program-level"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Tingkat Kesulitan *
                      </label>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                          draft.level === "Pemula"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : draft.level === "Mahir"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                        }`}
                      >
                        Level: {draft.level || "Menengah"}
                      </span>
                    </div>
                    <select
                      id="program-level"
                      className="admin-input w-full"
                      value={draft.level || "Menengah"}
                      onChange={(e) =>
                        set(
                          "level",
                          e.target.value as "Pemula" | "Menengah" | "Mahir"
                        )
                      }
                    >
                      <option value="Pemula">Pemula (Dasar / Fundamental) — Tanpa prasyarat teknis khusus</option>
                      <option value="Menengah">Menengah (Intermediate) — Membutuhkan pemahaman dasar atau pengalaman praktis</option>
                      <option value="Mahir">Mahir (Advanced / Spesialis) — Pembahasan mendalam, arsitektur, dan studi kasus lanjutan</option>
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Menentukan lencana tingkat kesulitan dan pencocokan filter pembelajar di Web Publik.
                    </p>
                  </div>

                  {/* Kata Kunci & Tag (Tags) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <label
                      htmlFor="program-tags-input"
                      className="admin-label font-bold text-slate-800 dark:text-slate-200"
                    >
                      Tag &amp; Kata Kunci Penelusuran
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="program-tags-input"
                        type="text"
                        className="admin-input flex-1"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddTag(tagInput);
                          }
                        }}
                        placeholder="Ketik tag lalu tekan Enter atau koma (contoh: Office, Word, Excel, Administrasi)..."
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(tagInput)}
                        className="admin-button-secondary shrink-0 text-xs font-bold py-2.5 px-3"
                      >
                        + Tambah Tag
                      </button>
                    </div>

                    {/* Interactive Tag Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 min-h-[30px]">
                      {(draft.tags || []).length === 0 ? (
                        <span className="text-[11px] italic text-slate-400">
                          Belum ada tag ditambahkan. Tag membantu algoritma pencarian di Web Publik.
                        </span>
                      ) : (
                        <>
                          {(draft.tags || []).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 shadow-2xs"
                            >
                              <span>#{tag}</span>
                              {coreEditable && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(idx)}
                                  className="text-sky-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold ml-0.5 text-sm leading-none focus:outline-hidden"
                                  aria-label={`Hapus tag ${tag}`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                          {coreEditable && (draft.tags || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => set("tags", [])}
                              className="text-[11px] text-slate-400 hover:text-rose-600 underline ml-2 transition"
                            >
                              Hapus semua tag
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Form Card 3: Target Peserta & Prasyarat */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-xs">
                      3
                    </span>
                    <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                      Audiens &amp; Persyaratan
                    </p>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    Target Peserta &amp; Panduan Kelayakan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bantu calon peserta memahami prasyarat kompetensi dan audiens sasaran program.
                  </p>
                </div>

                <fieldset disabled={!coreEditable || busy} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="program-audience"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Sasaran Peserta
                      </label>
                      <textarea
                        id="program-audience"
                        maxLength={500}
                        rows={3}
                        className="admin-input mt-1.5 leading-relaxed"
                        value={draft.audience}
                        onChange={(event) => set("audience", event.target.value)}
                        placeholder="Contoh: Staf administrasi publik, pengelola arsip digital, dan umum yang ingin meningkatkan efisiensi kerja..."
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="program-eligibility"
                        className="admin-label font-bold text-slate-800 dark:text-slate-200"
                      >
                        Panduan Kelayakan (Eligibility)
                      </label>
                      <textarea
                        id="program-eligibility"
                        maxLength={1000}
                        rows={3}
                        className="admin-input mt-1.5 leading-relaxed"
                        value={draft.eligibility_text}
                        onChange={(event) =>
                          set("eligibility_text", event.target.value)
                        }
                        placeholder="Prasyarat latar belakang, kepemilikan akun dinas, atau sertifikasi sebelum mendaftar..."
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Copy ini sebagai panduan informasi; enrollment resmi tetap divalidasi oleh state Moodle.
                      </p>
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Form Card 4: Komposisi course */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <section>
                  <div className="mb-4 flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-xs">
                          4
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          Komposisi course *
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Urutan ini menjadi alur belajar terstruktur pada Web Publik dan Moodle.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {(draft.courses || []).length}/50 Kursus
                    </span>
                  </div>

                  <fieldset disabled={!coreEditable || busy} className="space-y-3">
                    {(draft.courses || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                        Belum ada kursus yang ditambahkan ke komposisi program ini.
                      </div>
                    ) : (
                      (draft.courses || []).map((course, index) => {
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

                    {coreEditable && (
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

              {/* Form Card 5: Cohort dan jadwal */}
              <div className="admin-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6 shadow-sm">
                <section>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-xs">
                          5
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          Batch / Gelombang Pelatihan &amp; Jadwal
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 text-[11px] font-bold">
                          Multi-Batch Aktif
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Satu objek program pelatihan ini mendukung multi gelombang (batch). Tambah dan kelola banyak gelombang belajar beserta periode pendaftaran dan pelaksanaan (WIB).
                      </p>
                    </div>
                    {cohortEditable && (
                      <button
                        type="button"
                        className="admin-button-secondary text-xs font-bold flex items-center gap-1.5"
                        onClick={() =>
                          set("cohorts", [
                            ...draft.cohorts,
                            {
                              label: `Gelombang ${draft.cohorts.length + 1}`,
                              starts_at: null,
                              ends_at: null,
                              enrollment_opens_at: null,
                              enrollment_closes_at: null,
                              status: "scheduled",
                            },
                          ])
                        }
                      >
                        <AdminIcon name="plus" className="h-3.5 w-3.5" />
                        <span>+ Tambah Gelombang / Batch</span>
                      </button>
                    )}
                  </div>

                  <fieldset disabled={!cohortEditable || busy} className="space-y-4">
                    {(draft.cohorts || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                        Belum ada gelombang / batch terjadwal untuk program ini. Klik &quot;+ Tambah Gelombang / Batch&quot; untuk menambahkan.
                      </div>
                    ) : (
                      (draft.cohorts || []).map((cohort, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/40 dark:bg-slate-800/20 space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                Gelombang #{index + 1}
                              </span>
                              {cohort.id && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                                  ID Terdaftar
                                </span>
                              )}
                            </div>
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
                              Hapus Gelombang
                            </button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label
                                htmlFor={`cohort-label-${index}`}
                                className="admin-label"
                              >
                                Label Gelombang / Batch *
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
                                placeholder="Contoh: Gelombang 2 - Batch April 2026"
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
                              <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label
                                    htmlFor={`${key}-${index}`}
                                    className="admin-label font-bold text-slate-800 dark:text-slate-200 text-xs"
                                  >
                                    {fieldLabel}{" "}
                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                      (WIB)
                                    </span>
                                  </label>
                                  {cohort[key] && cohortEditable && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateCohort(index, key, null)
                                      }
                                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition"
                                      title="Kosongkan tanggal ini"
                                    >
                                      Bersihkan
                                    </button>
                                  )}
                                </div>
                                <input
                                  id={`${key}-${index}`}
                                  type="datetime-local"
                                  className="admin-input"
                                  value={toInputDate(cohort[key])}
                                  onChange={(event) =>
                                    updateCohort(
                                      index,
                                      key,
                                      fromInputDate(event.target.value)
                                    )
                                  }
                                />
                                <div className="min-h-[18px] text-[11px]">
                                  {cohort[key] ? (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <span>✓</span>{" "}
                                      {formatWibPreview(cohort[key])}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">
                                      Belum ditentukan (opsional)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </fieldset>
                </section>
              </div>

              {/* Form Error Alert & Session Refresh Action */}
              {error && (
                <div
                  id="form-error-alert"
                  role="alert"
                  className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-base leading-none mt-0.5">⚠️</span>
                    <div>
                      <p className="font-bold text-rose-800 dark:text-rose-300">Gagal Menyimpan:</p>
                      <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">{error}</p>
                    </div>
                  </div>
                  {(error.toLowerCase().includes("sesi") ||
                    error.toLowerCase().includes("token") ||
                    error.toLowerCase().includes("login") ||
                    error.toLowerCase().includes("konflik")) && (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="admin-button text-xs whitespace-nowrap self-stretch sm:self-auto py-2 px-3 flex items-center justify-center gap-1.5"
                    >
                      <AdminIcon name="refresh" className="h-3.5 w-3.5" />
                      Muat Ulang Halaman &amp; Masuk Ulang
                    </button>
                  )}
                </div>
              )}

              {/* Form Footer Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selected
                    ? !unlockCoreInfo
                      ? "Informasi utama program terkunci. Anda dapat menambah, mengubah, atau menghapus Gelombang (Batch) pelatihan di atas lalu menyimpan langsung."
                      : "Mode perubahan informasi utama aktif. Perubahan detail program, komposisi kursus, dan gelombang akan disimpan."
                    : "Pastikan seluruh data dan komposisi kursus telah sesuai sebelum mendaftarkan draf program baru."}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="admin-button-secondary"
                    onClick={closeForm}
                  >
                    Batal / Tutup
                  </button>
                  {cohortEditable && (
                    <button
                      type="submit"
                      className="admin-button"
                      disabled={busy || (draft.courses || []).length === 0}
                    >
                      {busy
                        ? "Menyimpan…"
                        : !selected
                        ? "Simpan draf program"
                        : unlockCoreInfo
                        ? "Simpan Perubahan Program & Gelombang"
                        : "Simpan Perubahan Gelombang"}
                    </button>
                  )}
                </div>
              </div>
            </form>

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
          </div>
        )}
        </section>
      </div>

      {/* Modal: Tambah Kategori / Bidang Keahlian Kustom Baru */}
      {mounted && isCategoryModalOpen && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCategoryModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCategoryModalOpen(false);
          }}
        >
          <div
            className="admin-card w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="admin-kicker text-xs font-black uppercase text-sky-600 dark:text-sky-400">
                  Taksonomi Program
                </p>
                <h3
                  id="category-modal-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5"
                >
                  Tambah Bidang Keahlian Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
                aria-label="Tutup modal"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Buat bidang keahlian baru untuk mengelompokkan program pelatihan. Kategori ini akan otomatis ditambahkan ke daftar opsi dan langsung diterapkan.
            </p>

            {categoryModalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {categoryModalError}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="new-category-name"
                className="admin-label font-bold text-slate-800 dark:text-slate-200"
              >
                Nama Kategori / Bidang Keahlian *
              </label>
              <input
                id="new-category-name"
                type="text"
                autoFocus
                className="admin-input"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setCategoryModalError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === "Escape") {
                    setIsCategoryModalOpen(false);
                  }
                }}
                placeholder="Contoh: Pemasaran Digital, Keuangan Publik..."
                maxLength={60}
              />
              <p className="text-[11px] text-slate-400">
                Maksimal 60 karakter, disarankan huruf kapital di awal setiap kata.
              </p>
            </div>

            {/* Rekomendasi Cepat */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Saran Cepat:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Pemasaran Digital",
                  "Kecerdasan Buatan Terapan",
                  "Administrasi Publik",
                  "Tata Kelola TI",
                  "Kepemimpinan & SDM",
                ]
                  .filter((item) => !allCategories.includes(item))
                  .slice(0, 4)
                  .map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setNewCategoryName(sug);
                        setCategoryModalError("");
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 transition"
                    >
                      + {sug}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="admin-button-secondary text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                className="admin-button text-xs font-bold"
              >
                Simpan &amp; Terapkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
