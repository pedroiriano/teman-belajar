"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { AdminDataTable } from "@/components/admin-data-table";
import { CubaBulkActionBar } from "@/components/bulk-actions/cuba-bulk-action-bar";
import { CubaBulkConfirmModal } from "@/components/bulk-actions/cuba-bulk-confirm-modal";
import { executeBulkActionAction } from "@/app/actions/bulk-actions";
import type {
  BulkActionType,
  BulkSelectedItem,
  BulkOperationProgress,
  BulkOperationResult,
} from "@/types/bulk-actions";

export interface KnowledgeArticleItem {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "in_review" | "approved" | "published" | "rejected" | "archived";
  current_revision_no: number;
  published_revision_no?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface CubaKnowledgeTableProps {
  articles: KnowledgeArticleItem[];
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

export function CubaKnowledgeTable({
  articles,
  itemCount,
  headerActions,
  errorMessage,
}: CubaKnowledgeTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<BulkActionType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [, startTransition] = useTransition();

  const isAllSelected = articles.length > 0 && selectedIds.size === articles.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < articles.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(articles.map((a) => a.id)));
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

  const selectedItems: BulkSelectedItem[] = articles
    .filter((a) => selectedIds.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      currentStatus: statusLabels[a.status] || a.status,
      module: "knowledge",
      slug: a.slug,
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
      // Simulate stepped progress for UX responsiveness
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

      const res = await executeBulkActionAction("knowledge", activeAction, selectedItems);

      clearInterval(stepInterval);
      setProgress({
        total,
        current: total,
        currentTitle: "Selesai",
        percent: 100,
      });

      setResult(res);
      startTransition(() => {
        // Triggers UI refresh
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
        title="Daftar artikel"
        description="Versi dan status publikasi artikel pengetahuan"
        itemCount={itemCount}
        headers={[
          { label: "Judul", key: "title" },
          { label: "Status", key: "status" },
          { label: "Revisi aktif / terbit", key: "revision" },
          { label: "Aksi", key: "actions" },
        ]}
        emptyState="Belum ada artikel pengetahuan. Buat draf pertama untuk memulai."
        error={errorMessage}
        retryHref="/dashboard/knowledge"
        actions={headerActions}
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        bulkActionBar={
          <CubaBulkActionBar
            selectedCount={selectedIds.size}
            totalCount={articles.length}
            onActionClick={handleActionClick}
            onClearSelection={handleClearSelection}
            disabled={isProcessing}
          />
        }
      >
        {articles.map((article) => {
          const isChecked = selectedIds.has(article.id);
          return (
            <tr
              key={article.id}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(article.id)}
                  aria-label={`Pilih artikel ${article.title}`}
                />
              </td>
              <td className="p-4" data-label="Judul">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {article.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {article.slug}
                </div>
              </td>
              <td className="p-4" data-label="Status">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(
                    article.status
                  )}`}
                >
                  {statusLabels[article.status] || article.status.replace("_", " ")}
                </span>
              </td>
              <td
                className="p-4 text-xs text-slate-600 dark:text-slate-400"
                data-label="Revisi"
              >
                <span>Revisi {article.current_revision_no}</span>
                <span className="ml-1 text-slate-400 dark:text-slate-500">
                  {article.published_revision_no
                    ? `(Terbit: Rev ${article.published_revision_no})`
                    : "(Belum terbit)"}
                </span>
              </td>
              <td className="p-4 text-xs font-semibold" data-label="Aksi">
                <Link
                  href={`/dashboard/knowledge/${article.id}`}
                  className="font-bold text-sky-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  Buka detail <span aria-hidden="true">→</span>
                </Link>
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
