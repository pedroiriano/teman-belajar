"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { AdminDataTable } from "@/components/admin-data-table";
import { CubaBulkActionBar } from "@/components/bulk-actions/cuba-bulk-action-bar";
import { CubaBulkConfirmModal } from "@/components/bulk-actions/cuba-bulk-confirm-modal";
import { AdminQuickLinks } from "@/components/admin-quick-links";
import { executeBulkActionAction } from "@/app/actions/bulk-actions";
import type {
  BulkActionType,
  BulkSelectedItem,
  BulkOperationProgress,
  BulkOperationResult,
} from "@/types/bulk-actions";

export interface NewsArticleItem {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "in_review" | "approved" | "published" | "rejected" | "archived";
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CubaNewsTableProps {
  news: NewsArticleItem[];
  itemCount: number;
  headerActions?: React.ReactNode;
  errorMessage?: string | null;
}

const statusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Dalam peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  rejected: "Perlu revisi",
  archived: "Diarsipkan",
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "approved":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300";
    case "in_review":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";
    case "rejected":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "archived":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function CubaNewsTable({
  news,
  itemCount,
  headerActions,
  errorMessage,
}: CubaNewsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<BulkActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [, startTransition] = useTransition();

  const isAllSelected = news.length > 0 && selectedIds.size === news.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < news.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(news.map((n) => n.id)));
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

  const handleActionClick = (action: BulkActionType) => {
    setActiveAction(action);
    setResult(null);
    setProgress(null);
    setIsModalOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleCloseModal = () => {
    if (isProcessing) return;
    setIsModalOpen(false);
    setActiveAction(null);
    if (result && result.failed === 0) {
      setSelectedIds(new Set());
    }
    setResult(null);
    setProgress(null);
  };

  const selectedItems: BulkSelectedItem[] = news
    .filter((n) => selectedIds.has(n.id))
    .map((n) => ({
      id: n.id,
      title: n.title,
      currentStatus: statusLabels[n.status] || n.status,
      module: "news",
      slug: n.slug,
    }));

  const handleConfirmBulk = async () => {
    if (!activeAction || selectedItems.length === 0) return;

    setIsProcessing(true);
    const total = selectedItems.length;
    setProgress({
      total,
      current: 1,
      currentTitle: selectedItems[0]?.title || "",
      percent: 15,
    });

    try {
      const stepInterval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return null;
          const nextCurrent = Math.min(prev.current + 1, prev.total);
          return {
            total: prev.total,
            current: nextCurrent,
            currentTitle: selectedItems[nextCurrent - 1]?.title || prev.currentTitle,
            percent: Math.min(Math.round((nextCurrent / prev.total) * 85), 85),
          };
        });
      }, 250);

      const res = await executeBulkActionAction("news", activeAction, selectedItems);

      clearInterval(stepInterval);
      setProgress({
        total,
        current: total,
        currentTitle: "Selesai",
        percent: 100,
      });

      setResult(res);
      startTransition(() => {
        // UI refresh
      });
    } catch (err: any) {
      setResult({
        total,
        succeeded: 0,
        failed: total,
        errors: [{ id: "err", title: "Sistem", error: err.message || "Gagal memproses aksi massal" }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AdminDataTable
        title="Daftar berita"
        description="Seluruh status editorial dan riwayat publikasi berita"
        itemCount={itemCount}
        headers={[
          { label: "Judul", key: "title" },
          { label: "Status", key: "status" },
          { label: "Diterbitkan", key: "published_at" },
          { label: "Aksi", key: "actions" },
        ]}
        emptyState="Belum ada berita. Buat draf pertama untuk memulai."
        error={errorMessage}
        retryHref="/dashboard/news"
        actions={headerActions}
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        bulkActionBar={
          <CubaBulkActionBar
            selectedCount={selectedIds.size}
            totalCount={news.length}
            onActionClick={handleActionClick}
            onClearSelection={handleClearSelection}
            disabled={isProcessing}
          />
        }
      >
        {news.map((item) => {
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
                  aria-label={`Pilih berita ${item.title}`}
                />
              </td>
              <td className="p-4" data-label="Judul">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.slug}
                </div>
              </td>
              <td className="p-4" data-label="Status">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(
                    item.status
                  )}`}
                >
                  {statusLabels[item.status] || item.status.replace("_", " ")}
                </span>
              </td>
              <td
                className="p-4 text-xs text-slate-600 dark:text-slate-400"
                data-label="Diterbitkan"
              >
                {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID") : "-"}
              </td>
              <td className="p-4 text-xs font-semibold" data-label="Aksi">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/news/${item.id}`}
                    className="font-bold text-sky-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                  >
                    Detail <span aria-hidden="true">→</span>
                  </Link>
                  {item.status === "published" && (
                    <AdminQuickLinks path={`/news/${item.slug}`} title={item.title} />
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      <CubaBulkConfirmModal
        isOpen={isModalOpen}
        action={activeAction}
        items={selectedItems}
        isProcessing={isProcessing}
        progress={progress}
        result={result}
        onConfirm={handleConfirmBulk}
        onClose={handleCloseModal}
      />
    </>
  );
}
