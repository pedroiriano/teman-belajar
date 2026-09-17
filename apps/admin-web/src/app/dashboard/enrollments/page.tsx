"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AdminIcon } from "@/components/admin-icon";
import { AdminDataTable } from "@/components/admin-data-table";
import { useCubaToast } from "@/components/cuba-toast";
import {
  getEnrollmentsAction,
  confirmEnrollmentAction,
  rejectEnrollmentAction,
  manualEnrollAction,
  bulkConfirmEnrollmentsAction,
  bulkRejectEnrollmentsAction,
} from "@/app/actions/enrollments";
import {
  getTrainingProgramOptionsAction,
  type TrainingProgramOptionItem,
} from "@/app/actions/training-programs";
import { CubaSelect2 } from "@/components/cuba-select2";
import type {
  EnrollmentApplication,
  EnrollmentFilter,
  EnrollmentMetrics,
  ManualEnrollInput,
} from "@/types/enrollment";

const emptySubscribe = () => () => {};

export default function EnrollmentsAdminPage() {
  const { success: toastSuccess, error: toastError } = useCubaToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [items, setItems] = useState<EnrollmentApplication[]>([]);
  const [metrics, setMetrics] = useState<EnrollmentMetrics>({
    total: 0,
    pending: 0,
    confirmed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting states
  const [sortKey, setSortKey] = useState<string>("applied_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Multi-select / Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [confirmModalItem, setConfirmModalItem] = useState<EnrollmentApplication | null>(null);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [rejectModalItem, setRejectModalItem] = useState<EnrollmentApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);
  const [bulkConfirmError, setBulkConfirmError] = useState<string | null>(null);

  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkRejectError, setBulkRejectError] = useState<string | null>(null);

  const DEFAULT_PROGRAM_OPTIONS: TrainingProgramOptionItem[] = useMemo(
    () => [
      {
        slug: "mikrotik-certified-network-associate-mtcna",
        title: "Mikrotik Certified Network Associate (MTCNA)",
        cohorts: [{ id: "683e429f-987b-4972-912e-c9f5cfa029d0", label: "Gelombang 1" }],
      },
      {
        slug: "pelatihan-microsoft-office-tingkat-dasar",
        title: "Pelatihan Microsoft Office Tingkat Dasar",
        cohorts: [{ id: "ad1528d8-32b2-4dbc-ae4c-d3ea30fa4098", label: "Gelombang 1" }],
      },
      {
        slug: "it-infrastructure-library-itil-4-foundation",
        title: "IT Infrastructure Library (ITIL) 4 Foundation",
        cohorts: [{ id: "39218f7e-fed7-4c14-8a47-bf049cb29f90", label: "Gelombang 1" }],
      },
      {
        slug: "audit-infrastruktur-dan-aplikasi-spbe",
        title: "Audit Infrastruktur dan Aplikasi SPBE",
        cohorts: [{ id: "e1a6b15b-cd25-4e84-837d-3118e7c6079c", label: "Gelombang 1" }],
      },
    ],
    []
  );

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [programOptions, setProgramOptions] = useState<TrainingProgramOptionItem[]>(DEFAULT_PROGRAM_OPTIONS);
  const [manualForm, setManualForm] = useState<ManualEnrollInput>({
    user_name: "",
    user_email: "",
    program_slug: DEFAULT_PROGRAM_OPTIONS[0].slug,
    cohort_id: DEFAULT_PROGRAM_OPTIONS[0].cohorts?.[0]?.id || "",
    notes: "",
  });

  const selectedProgram = useMemo(
    () => programOptions.find((p) => p.slug === manualForm.program_slug),
    [programOptions, manualForm.program_slug]
  );
  const currentProgramCohorts = selectedProgram?.cohorts || [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch actual Training Programs dynamically from API
  useEffect(() => {
    let active = true;
    void getTrainingProgramOptionsAction().then((res) => {
      if (!active) return;
      if (res.success && res.programs && res.programs.length > 0) {
        setProgramOptions(res.programs);
        setManualForm((prev) => {
          const currentExists = res.programs.some((p) => p.slug === prev.program_slug);
          const selectedProg = currentExists
            ? res.programs.find((p) => p.slug === prev.program_slug)
            : res.programs[0];
          return {
            ...prev,
            program_slug: selectedProg ? selectedProg.slug : prev.program_slug,
            cohort_id: selectedProg?.cohorts?.[0]?.id || prev.cohort_id || "",
          };
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Lock background scrolling when any modal popup is active
  const isAnyModalOpen = Boolean(
    confirmModalItem ||
    rejectModalItem ||
    bulkConfirmModalOpen ||
    bulkRejectModalOpen ||
    manualModalOpen
  );

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    const prevTouch = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      document.body.style.touchAction = prevTouch;
    };
  }, [isAnyModalOpen]);

  // Handle ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        setConfirmModalItem(null);
        setRejectModalItem(null);
        setBulkConfirmModalOpen(false);
        setBulkRejectModalOpen(false);
        setManualModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: EnrollmentFilter = {
        status: statusFilter,
        q: searchQuery,
        page,
        page_size: pageSize,
      };
      const res = await getEnrollmentsAction(filter);
      setItems(res.enrollments);
      setMetrics(res.metrics);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error("Failed to refresh enrollment data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page, pageSize]);

  useEffect(() => {
    let active = true;
    void getEnrollmentsAction({
      status: statusFilter,
      q: searchQuery,
      page,
      page_size: pageSize,
    }).then((res) => {
      if (!active) return;
      setItems(res.enrollments);
      setMetrics(res.metrics);
      setTotalCount(res.pagination.total);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [statusFilter, searchQuery, page, pageSize]);

  // Handle Sort
  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "user_name") {
        comparison = (a.user_name || "").localeCompare(b.user_name || "", "id");
      } else if (sortKey === "program_title") {
        comparison = (a.program_title || "").localeCompare(b.program_title || "", "id");
      } else if (sortKey === "cohort_label") {
        comparison = (a.cohort_label || "").localeCompare(b.cohort_label || "", "id");
      } else if (sortKey === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else if (sortKey === "applied_at") {
        const timeA = a.applied_at ? new Date(a.applied_at).getTime() : 0;
        const timeB = b.applied_at ? new Date(b.applied_at).getTime() : 0;
        comparison = timeA - timeB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [items, sortKey, sortDirection]);

  // Bulk Selection Handlers
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Actions
  const handleConfirmSubmit = async () => {
    if (!confirmModalItem) return;
    setIsSubmitting(true);
    setConfirmError(null);
    try {
      const res = await confirmEnrollmentAction(confirmModalItem.id, confirmNotes);
      if (res.success) {
        toastSuccess("Pendaftaran Dikonfirmasi", `Pendaftaran peserta ${confirmModalItem.user_name} berhasil disetujui dan disinkronkan ke Moodle.`);
        setFeedbackNotice({ type: "success", text: `Pendaftaran untuk ${confirmModalItem.user_name} berhasil dikonfirmasi dan disinkronkan ke kursus Moodle.` });
        setConfirmModalItem(null);
        setConfirmNotes("");
        await refreshData();
      } else {
        const errMsg = res.error || "Gagal mengonfirmasi pendaftaran.";
        setConfirmError(errMsg);
        toastError("Konfirmasi Gagal", errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengonfirmasi.";
      setConfirmError(errMsg);
      toastError("Konfirmasi Gagal", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalItem) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError("Mohon cantumkan alasan penolakan yang jelas (minimal 5 karakter).");
      return;
    }
    setIsSubmitting(true);
    setRejectError(null);
    try {
      const res = await rejectEnrollmentAction(rejectModalItem.id, rejectReason);
      if (res.success) {
        toastSuccess("Pendaftaran Ditolak", `Permohonan pendaftaran ${rejectModalItem.user_name} telah ditolak.`);
        setFeedbackNotice({ type: "success", text: `Permohonan pendaftaran ${rejectModalItem.user_name} telah ditolak.` });
        setRejectModalItem(null);
        setRejectReason("");
        await refreshData();
      } else {
        const errMsg = res.error || "Gagal menolak pendaftaran.";
        setRejectError(errMsg);
        toastError("Gagal Menolak", errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat menolak.";
      setRejectError(errMsg);
      toastError("Gagal Menolak", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkConfirmSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setBulkConfirmError(null);
    try {
      const res = await bulkConfirmEnrollmentsAction(Array.from(selectedIds));
      if (res.success) {
        toastSuccess("Konfirmasi Massal Berhasil", `Berhasil mengonfirmasi ${res.count} permohonan pendaftaran.`);
        setFeedbackNotice({ type: "success", text: `Berhasil mengonfirmasi ${res.count} permohonan pendaftaran ke Moodle.` });
        setSelectedIds(new Set());
        setBulkConfirmModalOpen(false);
        await refreshData();
      } else {
        const errMsg = res.error || "Gagal mengonfirmasi pendaftaran massal.";
        setBulkConfirmError(errMsg);
        toastError("Konfirmasi Massal Gagal", errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat konfirmasi massal.";
      setBulkConfirmError(errMsg);
      toastError("Konfirmasi Massal Gagal", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkRejectSubmit = async () => {
    if (selectedIds.size === 0) return;
    if (!bulkRejectReason.trim() || bulkRejectReason.trim().length < 5) {
      setBulkRejectError("Mohon cantumkan alasan penolakan massal yang jelas (minimal 5 karakter).");
      return;
    }
    setIsSubmitting(true);
    setBulkRejectError(null);
    try {
      const res = await bulkRejectEnrollmentsAction(Array.from(selectedIds), bulkRejectReason);
      if (res.success) {
        toastSuccess("Penolakan Massal Berhasil", `Berhasil menolak ${res.count} permohonan pendaftaran.`);
        setFeedbackNotice({ type: "success", text: `Berhasil menolak ${res.count} permohonan pendaftaran.` });
        setSelectedIds(new Set());
        setBulkRejectModalOpen(false);
        setBulkRejectReason("");
        await refreshData();
      } else {
        const errMsg = res.error || "Gagal menolak pendaftaran massal.";
        setBulkRejectError(errMsg);
        toastError("Penolakan Massal Gagal", errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat penolakan massal.";
      setBulkRejectError(errMsg);
      toastError("Penolakan Massal Gagal", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.user_name || !manualForm.user_email) {
      setManualError("Nama dan email peserta wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    setManualError(null);
    try {
      const res = await manualEnrollAction(manualForm);
      if (res.success) {
        toastSuccess("Pendaftaran Berhasil", `Peserta ${manualForm.user_name} berhasil didaftarkan secara manual.`);
        setFeedbackNotice({ type: "success", text: `Peserta ${manualForm.user_name} berhasil didaftarkan dan dikonfirmasi.` });
        setManualModalOpen(false);
        setManualForm({
          user_name: "",
          user_email: "",
          program_slug: programOptions[0]?.slug || DEFAULT_PROGRAM_OPTIONS[0].slug,
          cohort_id: programOptions[0]?.cohorts?.[0]?.id || DEFAULT_PROGRAM_OPTIONS[0].cohorts?.[0]?.id || "",
          notes: "",
        });
        await refreshData();
      } else {
        const errMsg = res.error || "Gagal mendaftarkan peserta.";
        setManualError(errMsg);
        toastError("Pendaftaran Gagal", errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mendaftar manual.";
      setManualError(errMsg);
      toastError("Pendaftaran Gagal", errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700/50">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Menunggu Konfirmasi
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Terkonfirmasi
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Header Actions button
  const headerActions = (
    <button
      type="button"
      onClick={() => {
        setManualError(null);
        setManualModalOpen(true);
      }}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
    >
      <AdminIcon name="plus" className="h-4 w-4" />
      <span>Pendaftaran Manual</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-5">
        <div>
          <span className="admin-page-kicker">Pembelajaran</span>
          <h1 className="admin-page-title">Konfirmasi Pendaftaran</h1>
          <p className="admin-page-copy">
            Kelola, seleksi, dan konfirmasi permohonan pendaftaran pembelajar ke program pelatihan dan kursus resmi.
          </p>
        </div>
        <div>
          {headerActions}
        </div>
      </div>

      {/* Notice Banner */}
      {feedbackNotice && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedbackNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AdminIcon
              name={feedbackNotice.type === "success" ? "check" : "alert"}
              className="h-4 w-4 shrink-0"
            />
            <span>{feedbackNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-xs font-bold underline hover:opacity-80 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Pendaftaran
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {metrics.total}
          </p>
        </div>
        <div className="admin-card p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            Menunggu Konfirmasi
          </span>
          <p className="mt-2 text-2xl font-black text-yellow-800 dark:text-yellow-300">
            {metrics.pending}
          </p>
        </div>
        <div className="admin-card p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Terkonfirmasi
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-300">
            {metrics.confirmed}
          </p>
        </div>
        <div className="admin-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ditolak
          </span>
          <p className="mt-2 text-2xl font-black text-slate-700 dark:text-slate-300">
            {metrics.rejected}
          </p>
        </div>
      </div>

      {/* Cuba AdminDataTable Component */}
      <AdminDataTable
        title="Daftar Permohonan Pendaftaran"
        description="Pilih baris untuk menjalankan aksi persetujuan massal atau gunakan kontrol baris individual"
        itemCount={items.length}
        loading={loading}
        headers={[
          { label: "Peserta", key: "user_name", sortable: true },
          { label: "Program Pelatihan", key: "program_title", sortable: true },
          { label: "Kohort / Jadwal", key: "cohort_label", sortable: true },
          { label: "Tanggal Pengajuan", key: "applied_at", sortable: true },
          { label: "Status", key: "status", sortable: true },
          { label: "Aksi", key: "actions", align: "right" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        emptyState="Belum ada permohonan pendaftaran yang sesuai kriteria pencarian."
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        searchPlaceholder="Cari nama, email, program..."
        statusFilter={statusFilter}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "pending", label: `Menunggu Konfirmasi (${metrics.pending})` },
          { value: "confirmed", label: "Terkonfirmasi" },
          { value: "rejected", label: "Ditolak" },
        ]}
        onStatusFilterChange={(s) => { setStatusFilter(s); setPage(1); }}
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        pageSizeOptions={[5, 10, 25, 50]}
        bulkActionBar={
          selectedIds.size > 0 ? (
            <aside
              aria-label="Bilah Aksi Massal Pendaftaran"
              className="cuba-bulk-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 sm:p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80 shadow-sm">
                    <AdminIcon name="check" className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {selectedIds.size} pendaftaran dipilih
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        dari {items.length} yang ditampilkan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                      Tindakan akan diterapkan serentak pada seluruh pendaftaran terpilih.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkConfirmError(null);
                      setBulkConfirmModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Konfirmasi Terpilih</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRejectError(null);
                      setBulkRejectReason("");
                      setBulkRejectModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <AdminIcon name="x" className="h-3.5 w-3.5 stroke-[2]" />
                    <span>Tolak Terpilih</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Batal Pilihan
                  </button>
                </div>
              </div>
            </aside>
          ) : null
        }
      >
        {sortedItems.map((item) => {
          const isChecked = selectedIds.has(item.id);
          return (
            <tr
              key={item.id}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(item.id)}
                  aria-label={`Pilih pendaftaran ${item.user_name}`}
                />
              </td>
              <td className="p-4" data-label="Peserta">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {item.user_name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {item.user_name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.user_email}</p>
                  </div>
                </div>
              </td>
              <td className="p-4" data-label="Program Pelatihan">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.program_title}
                </p>
                {item.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={item.notes}>
                    Catatan: {item.notes}
                  </p>
                )}
              </td>
              <td className="p-4" data-label="Kohort / Jadwal">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {item.cohort_label || "Umum"}
                </span>
              </td>
              <td className="p-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" data-label="Tanggal Pengajuan">
                {new Date(item.applied_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="p-4 whitespace-nowrap" data-label="Status">
                {getStatusBadge(item.status)}
                {item.status === "rejected" && item.rejection_reason && (
                  <p className="text-[10px] text-rose-500 mt-1 max-w-xs truncate" title={item.rejection_reason}>
                    Alasan: {item.rejection_reason}
                  </p>
                )}
              </td>
              <td className="p-4 text-right whitespace-nowrap" data-label="Aksi">
                {item.status === "pending" ? (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmError(null);
                        setConfirmNotes("");
                        setConfirmModalItem(item);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Konfirmasi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectError(null);
                        setRejectReason("");
                        setRejectModalItem(item);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 font-bold text-xs transition-all cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Oleh {item.confirmed_by || "Admin"}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      {/* Modal: Konfirmasi Pendaftaran Tunggal (Portaled to document.body) */}
      {mounted && confirmModalItem && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setConfirmModalItem(null);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setConfirmModalItem(null);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <AdminIcon name="check" className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                    Konfirmasi Pendaftaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Setujui permohonan dan sinkronkan hak akses kursus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {confirmError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0" />
                <span>{confirmError}</span>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Peserta:</span>
                <span className="font-bold text-slate-900 dark:text-white">{confirmModalItem.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Email:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{confirmModalItem.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Program:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate" title={confirmModalItem.program_title}>
                  {confirmModalItem.program_title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Kohort / Jadwal:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{confirmModalItem.cohort_label || "Umum"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Konfirmasi (Opsional)
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Tambahkan instruksi kelas, tautan grup, atau catatan pembelajar..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Setujui & Konfirmasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tolak Pendaftaran Tunggal (Portaled to document.body) */}
      {mounted && rejectModalItem && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setRejectModalItem(null);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setRejectModalItem(null);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AdminIcon name="x" className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 id="reject-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                    Tolak Permohonan Pendaftaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Permohonan {rejectModalItem.user_name} akan ditolak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2 text-xs border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Peserta:</span>
                <span className="font-bold text-slate-900 dark:text-white">{rejectModalItem.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Program:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate" title={rejectModalItem.program_title}>
                  {rejectModalItem.program_title}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Kuota kelas telah penuh, atau prasyarat kompetensi belum memenuhi..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <AdminIcon name="x" className="h-3.5 w-3.5 stroke-[2]" />
                    <span>Konfirmasi Penolakan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Konfirmasi Massal (Portaled to document.body) */}
      {mounted && bulkConfirmModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setBulkConfirmModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setBulkConfirmModalOpen(false);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <AdminIcon name="check" className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 id="bulk-confirm-title" className="text-base font-black text-slate-900 dark:text-white">
                    Konfirmasi Massal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedIds.size} pendaftaran akan disetujui serentak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkConfirmModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {bulkConfirmError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0" />
                <span>{bulkConfirmError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Seluruh {selectedIds.size} peserta terpilih akan disetujui status pendaftarannya dan otomatis didaftarkan ke kursus Moodle terkait.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkConfirmSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Setujui {selectedIds.size} Pendaftaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tolak Massal (Portaled to document.body) */}
      {mounted && bulkRejectModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-reject-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setBulkRejectModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setBulkRejectModalOpen(false);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AdminIcon name="x" className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 id="bulk-reject-title" className="text-base font-black text-slate-900 dark:text-white">
                    Tolak Pendaftaran Massal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedIds.size} pendaftaran akan ditolak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkRejectModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {bulkRejectError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0" />
                <span>{bulkRejectError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan Massal <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                placeholder="Contoh: Kuota angkatan telah terpenuhi..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkRejectModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkRejectSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <AdminIcon name="x" className="h-3.5 w-3.5 stroke-[2]" />
                    <span>Tolak {selectedIds.size} Pendaftaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Pendaftaran Manual (Portaled to document.body) */}
      {mounted && manualModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setManualModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setManualModalOpen(false);
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                  <AdminIcon name="plus" className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 id="manual-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                    Pendaftaran Peserta Secara Manual
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daftarkan peserta secara langsung ke program pelatihan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Peserta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualForm.user_name}
                  onChange={(e) => setManualForm({ ...manualForm, user_name: e.target.value })}
                  placeholder="Contoh: Rian Hidayat"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Peserta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={manualForm.user_email}
                  onChange={(e) => setManualForm({ ...manualForm, user_email: e.target.value })}
                  placeholder="Contoh: rian.hidayat@instansi.go.id"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Program Pelatihan <span className="text-rose-500">*</span>
                </label>
                <CubaSelect2
                  value={manualForm.program_slug}
                  onChange={(slug) => {
                    const prog = programOptions.find((p) => p.slug === slug);
                    setManualForm({
                      ...manualForm,
                      program_slug: slug,
                      cohort_id: prog?.cohorts?.[0]?.id || "",
                    });
                  }}
                  options={programOptions.map((prog) => ({
                    value: prog.slug,
                    label: prog.title,
                  }))}
                  placeholder="Pilih Program Pelatihan..."
                  searchPlaceholder="Cari program pelatihan..."
                  searchable={true}
                  aria-label="Pilih Program Pelatihan"
                />
              </div>

              {currentProgramCohorts.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Gelombang / Kohort <span className="text-rose-500">*</span>
                  </label>
                  <CubaSelect2
                    value={manualForm.cohort_id || (currentProgramCohorts[0]?.id ?? "")}
                    onChange={(cohortId) => setManualForm({ ...manualForm, cohort_id: cohortId })}
                    options={currentProgramCohorts.map((c) => ({
                      value: c.id,
                      label: c.label,
                    }))}
                    placeholder="Pilih Gelombang / Kohort..."
                    searchable={false}
                    aria-label="Pilih Gelombang atau Kohort"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Pendaftaran (Opsional)
                </label>
                <textarea
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Catatan penugasan dari pimpinan unit kerja..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Daftarkan & Konfirmasi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
