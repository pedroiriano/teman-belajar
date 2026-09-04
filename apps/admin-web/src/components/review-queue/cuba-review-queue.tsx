"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AdminIcon } from "@/components/admin-icon";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminClientPagination } from "@/components/admin-pagination";
import {
  transitionReviewItemAction,
} from "@/app/actions/review-queue";
import {
  type ReviewQueueItem,
  reviewModuleLabels,
  reviewModuleHrefs,
  reviewStatusLabels,
  reviewStatusBadgeClasses,
} from "@/types/review-queue";
import { CubaBulkActionBar } from "@/components/bulk-actions/cuba-bulk-action-bar";
import { CubaBulkConfirmModal } from "@/components/bulk-actions/cuba-bulk-confirm-modal";
import { executeBulkActionAction } from "@/app/actions/bulk-actions";
import type {
  BulkActionType,
  BulkSelectedItem,
  BulkOperationProgress,
  BulkOperationResult,
} from "@/types/bulk-actions";


interface CubaReviewQueueProps {
  initialItems: ReviewQueueItem[];
  roles: string[];
}

interface ConfirmationModalState {
  item: ReviewQueueItem;
  targetStatus: string;
  notes: string;
}

export function CubaReviewQueue({ initialItems, roles }: CubaReviewQueueProps) {
  const [items, setItems] = useState<ReviewQueueItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("in_review");
  const [sortKey, setSortKey] = useState<"updated_at" | "title" | "module" | "status">("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState | null>(null);
  const [isPending, startTransition] = useTransition();

  // Multi-item selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkOperationProgress | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(null);

  const canReview = roles.some((r) =>
    ["Portal Administrator", "Reviewer"].includes(r)
  );
  const canWrite = roles.some((r) =>
    ["Portal Administrator", "Content Editor"].includes(r)
  );


  // KPI Counters
  const kpi = useMemo(() => {
    let pending_review = 0;
    let approved = 0;
    let needs_revision = 0;
    for (const item of items) {
      if (item.status === "in_review") pending_review++;
      else if (item.status === "approved") approved++;
      else if (item.status === "draft") needs_revision++;
    }
    return {
      pending_review,
      approved,
      needs_revision,
      total: items.length,
    };
  }, [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchStatus) return false;

      const matchModule =
        moduleFilter === "all" || item.module.toLowerCase() === moduleFilter.toLowerCase();
      if (!matchModule) return false;

      if (!q) return true;
      const modLabel = reviewModuleLabels[item.module] || item.module;
      const statLabel = reviewStatusLabels[item.status] || item.status;
      return (
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        modLabel.toLowerCase().includes(q) ||
        statLabel.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, statusFilter, moduleFilter]);

  // Sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let first: string | number = a[sortKey] || "";
      let second: string | number = b[sortKey] || "";

      if (sortKey === "updated_at") {
        first = new Date(a.updated_at).getTime();
        second = new Date(b.updated_at).getTime();
      }

      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const handleSort = (key: "updated_at" | "title" | "module" | "status") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const openConfirmModal = (item: ReviewQueueItem, targetStatus: string) => {
    setError("");
    setNotice("");
    setConfirmModal({
      item,
      targetStatus,
      notes: "",
    });
  };

  const executeTransition = () => {
    if (!confirmModal) return;
    const { item, targetStatus, notes } = confirmModal;

    startTransition(async () => {
      setError("");
      const result = await transitionReviewItemAction({
        id: item.id,
        module: item.module,
        targetStatus,
        reviewerNotes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Gagal memperbarui status alur kerja.");
        return;
      }

      // Update local item status
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.module === item.module
            ? { ...it, status: targetStatus, updated_at: new Date().toISOString() }
            : it
        )
      );

      const targetLabel = reviewStatusLabels[targetStatus] || targetStatus;
      setNotice(
        `Berhasil: Konten "${item.title}" dipindahkan ke status ${targetLabel}.`
      );
      setConfirmModal(null);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      paginatedItems.forEach((it) => next.add(it.id));
    } else {
      paginatedItems.forEach((it) => next.delete(it.id));
    }
    setSelectedIds(next);
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

  const handleOpenBulkAction = (action: BulkActionType) => {
    setBulkAction(action);
    setBulkResult(null);
    setBulkProgress(null);
    setIsBulkModalOpen(true);
  };

  const handleCloseBulkModal = () => {
    if (isBulkProcessing) return;
    setIsBulkModalOpen(false);
    setBulkAction(null);
    if (bulkResult && bulkResult.failed === 0) {
      setSelectedIds(new Set());
    }
    setBulkResult(null);
    setBulkProgress(null);
  };

  const selectedReviewItems: BulkSelectedItem[] = useMemo(() => {
    return items
      .filter((it) => selectedIds.has(it.id))
      .map((it) => ({
        id: it.id,
        title: it.title,
        currentStatus: reviewStatusLabels[it.status] || it.status,
        module: "review-queue",
      }));
  }, [items, selectedIds]);

  const handleConfirmBulk = async () => {
    if (!bulkAction || selectedReviewItems.length === 0) return;

    setIsBulkProcessing(true);
    const total = selectedReviewItems.length;
    setBulkProgress({
      total,
      current: 1,
      currentTitle: selectedReviewItems[0]?.title || "",
      percent: 15,
    });

    try {
      const stepInterval = setInterval(() => {
        setBulkProgress((prev) => {
          if (!prev) return null;
          const nextCurrent = Math.min(prev.current + 1, prev.total);
          return {
            total: prev.total,
            current: nextCurrent,
            currentTitle: selectedReviewItems[nextCurrent - 1]?.title || prev.currentTitle,
            percent: Math.min(Math.round((nextCurrent / prev.total) * 85), 85),
          };
        });
      }, 250);

      const res = await executeBulkActionAction("review-queue", bulkAction, selectedReviewItems);

      clearInterval(stepInterval);
      setBulkProgress({
        total,
        current: total,
        currentTitle: "Selesai",
        percent: 100,
      });

      setBulkResult(res);

      if (res.succeeded > 0) {
        const targetStatus = bulkAction === "approve" ? "approved" : bulkAction === "publish" ? "published" : "draft";
        setItems((prev) =>
          prev.map((it) =>
            selectedIds.has(it.id)
              ? { ...it, status: targetStatus as any, updated_at: new Date().toISOString() }
              : it
          )
        );
        setNotice(`${res.succeeded} konten berhasil diperbarui secara massal.`);
      }
    } catch (err: any) {
      setBulkResult({
        total,
        succeeded: 0,
        failed: total,
        errors: [{ id: "err", title: "Sistem", error: err.message || "Gagal mengeksekusi operasi massal" }],
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (

    <div className="space-y-6">
      {/* 4 Cuba KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Menunggu Peninjauan */}
        <article
          onClick={() => { setStatusFilter("in_review"); setPage(1); }}
          className={`admin-card cursor-pointer p-5 transition-all hover:scale-[1.02] ${
            statusFilter === "in_review"
              ? "ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-md"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Menunggu Peninjauan
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {kpi.pending_review}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400 shadow-sm">
              <AdminIcon name="clock" className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Perlu evaluasi kelayakan terbit
          </p>
        </article>

        {/* KPI 2: Siap Terbit (Disetujui) */}
        <article
          onClick={() => { setStatusFilter("approved"); setPage(1); }}
          className={`admin-card cursor-pointer p-5 transition-all hover:scale-[1.02] ${
            statusFilter === "approved"
              ? "ring-2 ring-sky-400 dark:ring-sky-500 shadow-md"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Siap Terbit (Disetujui)
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {kpi.approved}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 shadow-sm">
              <AdminIcon name="check" className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Disetujui & siap rilis ke publik
          </p>
        </article>

        {/* KPI 3: Perlu Revisi (Draf) */}
        <article
          onClick={() => { setStatusFilter("draft"); setPage(1); }}
          className={`admin-card cursor-pointer p-5 transition-all hover:scale-[1.02] ${
            statusFilter === "draft"
              ? "ring-2 ring-slate-400 dark:ring-slate-500 shadow-md"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Perlu Revisi (Draf)
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {kpi.needs_revision}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shadow-sm">
              <AdminIcon name="edit" className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Dikembalikan ke editor konten
          </p>
        </article>

        {/* KPI 4: Total Item Terdaftar */}
        <article
          onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={`admin-card cursor-pointer p-5 transition-all hover:scale-[1.02] ${
            statusFilter === "all"
              ? "ring-2 ring-blue-400 dark:ring-blue-500 shadow-md"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Item Antrean
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {kpi.total}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm">
              <AdminIcon name="audit" className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Lintas 7 modul editorial terpadu
          </p>
        </article>
      </div>

      {/* Notifications / Feedback Alerts */}
      {notice && (
        <div
          role="status"
          className="admin-alert-success flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <AdminIcon name="check" className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="admin-alert-error flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <AdminIcon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-bold text-rose-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <section className="admin-card p-5 space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">
            Status:
          </span>
          <button
            type="button"
            onClick={() => { setStatusFilter("in_review"); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "in_review"
                ? "bg-yellow-400/20 text-yellow-800 border border-yellow-400/40 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Menunggu Peninjauan
            <span className="cuba-badge cuba-badge-warning text-[10px] py-0 px-1.5">
              {kpi.pending_review}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("approved"); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "approved"
                ? "bg-sky-500/20 text-sky-800 border border-sky-400/40 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Siap Terbit
            <span className="cuba-badge cuba-badge-primary text-[10px] py-0 px-1.5">
              {kpi.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("draft"); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "draft"
                ? "bg-slate-300/40 text-slate-800 border border-slate-400 dark:bg-slate-800 dark:text-slate-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Perlu Revisi (Draf)
            <span className="cuba-badge cuba-badge-neutral text-[10px] py-0 px-1.5">
              {kpi.needs_revision}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Semua
            <span className="opacity-80 text-[10px]">({kpi.total})</span>
          </button>
        </div>

        {/* Search & Module Dropdown Controls */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <AdminIcon name="search" className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Cari judul, penulis, modul, atau ID…"
              className="admin-input pl-9"
              aria-label="Cari antrean peninjauan"
            />
          </div>

          <div>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="admin-input font-bold"
              aria-label="Filter modul konten"
            >
              <option value="all">Semua Modul Konten</option>
              {Object.entries(reviewModuleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Cuba DataTable */}
      <AdminDataTable
        title="Daftar Antrean Peninjauan"
        description={`${sortedItems.length} konten memenuhi filter saat ini`}
        itemCount={sortedItems.length}
        headers={[
          { label: "Modul", key: "module", sortable: true },
          { label: "Judul Konten & Penulis", key: "title", sortable: true },
          { label: "Status", key: "status", sortable: true },
          { label: "Terakhir Diperbarui", key: "updated_at", sortable: true },
          { label: "Aksi Peninjau" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={(key: string) => handleSort(key as "updated_at" | "title" | "module" | "status")}
        emptyState="Tidak ada konten pada antrean peninjauan untuk kriteria filter ini."
        selectable={true}
        isAllSelected={paginatedItems.length > 0 && paginatedItems.every((it) => selectedIds.has(it.id))}
        isSomeSelected={paginatedItems.some((it) => selectedIds.has(it.id)) && !paginatedItems.every((it) => selectedIds.has(it.id))}
        onToggleSelectAll={handleToggleSelectAll}
        bulkActionBar={
          <CubaBulkActionBar
            selectedCount={selectedIds.size}
            totalCount={sortedItems.length}
            onActionClick={handleOpenBulkAction}
            onClearSelection={() => setSelectedIds(new Set())}
            disabled={isBulkProcessing}
            allowedActions={["approve", "publish", "delete"]}
          />
        }
      >
        {paginatedItems.map((item) => {
          const modLabel = reviewModuleLabels[item.module] || item.module;
          const statLabel = reviewStatusLabels[item.status] || item.status;
          const badgeClass = reviewStatusBadgeClasses[item.status] || "cuba-badge-neutral";
          const editorHref = reviewModuleHrefs[item.module]
            ? reviewModuleHrefs[item.module](item.id)
            : `/dashboard/${item.module}`;
          const isChecked = selectedIds.has(item.id);

          return (
            <tr
              key={`${item.module}-${item.id}`}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              {/* Kolom Checkbox */}
              <td className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(item.id)}
                  aria-label={`Pilih ${item.title}`}
                />
              </td>

              {/* Kolom Modul */}
              <td className="p-4" data-label="Modul">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-black text-slate-700 dark:text-slate-200">
                  <AdminIcon name="file" className="h-3.5 w-3.5 text-sky-600" />
                  {modLabel}
                </span>
              </td>

              {/* Kolom Judul & Penulis */}
              <td className="p-4" data-label="Judul Konten & Penulis">
                <div className="max-w-md">
                  <Link
                    href={editorHref}
                    className="font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 line-clamp-1 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.author || "Anonim"}</span> · ID: <span className="font-mono text-[11px] opacity-75">{item.id.slice(0, 8)}…</span>
                  </p>
                </div>
              </td>

              {/* Kolom Status */}
              <td className="p-4" data-label="Status">
                <span className={`cuba-badge ${badgeClass}`}>
                  {statLabel}
                </span>
              </td>

              {/* Kolom Terakhir Diperbarui */}
              <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Terakhir Diperbarui">
                <div className="flex items-center gap-1.5">
                  <AdminIcon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                  <time dateTime={item.updated_at}>
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </time>
                </div>
              </td>

              {/* Kolom Aksi Peninjau */}
              <td className="p-4" data-label="Aksi Peninjau">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Aksi cepat untuk status in_review */}
                  {canReview && item.status === "in_review" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openConfirmModal(item, "approved")}
                        className="admin-button !min-h-8 !px-2.5 !py-1 text-xs"
                        title="Setujui konten ini agar siap dipublikasikan"
                      >
                        <AdminIcon name="check" className="h-3.5 w-3.5" />
                        Setujui
                      </button>

                      <button
                        type="button"
                        onClick={() => openConfirmModal(item, "draft")}
                        className="admin-button-secondary !min-h-8 !px-2.5 !py-1 text-xs !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-950/40 border-rose-200"
                        title="Kembalikan konten ini ke draf untuk diperbaiki"
                      >
                        <AdminIcon name="x" className="h-3.5 w-3.5" />
                        Kembalikan
                      </button>
                    </>
                  )}

                  {/* Aksi cepat untuk status approved */}
                  {canReview && item.status === "approved" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openConfirmModal(item, "published")}
                        className="admin-button !min-h-8 !px-2.5 !py-1 text-xs !bg-emerald-600 hover:!bg-emerald-700"
                        title="Terbitkan konten ini ke portal publik"
                      >
                        <AdminIcon name="check" className="h-3.5 w-3.5" />
                        Terbitkan
                      </button>

                      <button
                        type="button"
                        onClick={() => openConfirmModal(item, "draft")}
                        className="admin-button-secondary !min-h-8 !px-2.5 !py-1 text-xs !text-rose-600 hover:!bg-rose-50 border-rose-200"
                        title="Batalkan persetujuan dan kembalikan ke draf"
                      >
                        <AdminIcon name="x" className="h-3.5 w-3.5" />
                        Ke Draf
                      </button>
                    </>
                  )}

                  {/* Aksi cepat untuk status draft (jika editor ingin mengajukan ulang) */}
                  {canWrite && item.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => openConfirmModal(item, "in_review")}
                      className="admin-button-secondary !min-h-8 !px-2.5 !py-1 text-xs"
                      title="Ajukan konten ini untuk ditinjau ulang"
                    >
                      <AdminIcon name="arrow" className="h-3.5 w-3.5" />
                      Ajukan Review
                    </button>
                  )}

                  {/* Link ke editor lengkap */}
                  <Link
                    href={editorHref}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Buka editor lengkap"
                  >
                    <AdminIcon name="external" className="h-3.5 w-3.5" />
                    Buka Editor
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      {/* Pagination */}
      <AdminClientPagination
        page={currentPage}
        pages={totalPages}
        total={sortedItems.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      {/* Cuba Workflow Confirmation Modal */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            {/* Header Dialog */}
            <div className="border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                    confirmModal.targetStatus === "approved"
                      ? "bg-sky-600"
                      : confirmModal.targetStatus === "published"
                      ? "bg-emerald-600"
                      : "bg-rose-600"
                  }`}
                >
                  <AdminIcon
                    name={
                      confirmModal.targetStatus === "approved"
                        ? "check"
                        : confirmModal.targetStatus === "published"
                        ? "check"
                        : "edit"
                    }
                    className="h-5 w-5"
                  />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {confirmModal.targetStatus === "approved"
                      ? "Setujui Konten Editorial"
                      : confirmModal.targetStatus === "published"
                      ? "Terbitkan Konten ke Publik"
                      : "Kembalikan Konten ke Draf"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modul {reviewModuleLabels[confirmModal.item.module]} · ID: {confirmModal.item.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup dialog"
              >
                <AdminIcon name="x" className="h-5 w-5" />
              </button>
            </div>

            {/* Konten & Catatan Peninjau */}
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Konten Yang Dievaluasi
                </p>
                <h4 className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                  {confirmModal.item.title}
                </h4>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Penulis: <strong className="text-slate-700 dark:text-slate-300">{confirmModal.item.author}</strong></span>
                  <span>·</span>
                  <span>Status Saat Ini: <strong className="text-slate-700 dark:text-slate-300">{reviewStatusLabels[confirmModal.item.status]}</strong></span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reviewer-notes"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Catatan Peninjau
                  {confirmModal.targetStatus === "draft" && (
                    <span className="ml-1 text-rose-500">* (Wajib sertakan alasan perbaikan)</span>
                  )}
                </label>
                <textarea
                  id="reviewer-notes"
                  rows={3}
                  value={confirmModal.notes}
                  onChange={(e) =>
                    setConfirmModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder={
                    confirmModal.targetStatus === "draft"
                      ? "Jelaskan bagian yang perlu disempurnakan atau direvisi oleh penulis..."
                      : "Catatan opsional mengenai kelayakan atau arahan publikasi..."
                  }
                  className="admin-input !h-auto py-2.5 text-xs"
                />
              </div>
            </div>

            {/* Footer Aksi */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="admin-button-secondary text-xs !min-h-9"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeTransition}
                disabled={isPending}
                className="admin-button text-xs !min-h-9"
              >
                {isPending
                  ? "Memproses…"
                  : confirmModal.targetStatus === "approved"
                  ? "Konfirmasi Persetujuan"
                  : confirmModal.targetStatus === "published"
                  ? "Terbitkan Sekarang"
                  : confirmModal.targetStatus === "draft"
                  ? "Kembalikan ke Draf"
                  : "Simpan Perubahan"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Cuba Bulk Confirm Modal with Progress Indicator */}
      <CubaBulkConfirmModal
        isOpen={isBulkModalOpen}
        action={bulkAction}
        items={selectedReviewItems}
        isProcessing={isBulkProcessing}
        progress={bulkProgress}
        result={bulkResult}
        onConfirm={handleConfirmBulk}
        onClose={handleCloseBulkModal}
      />
    </div>
  );
}
