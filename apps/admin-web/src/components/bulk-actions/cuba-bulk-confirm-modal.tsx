"use client";

import React from "react";
import { AdminIcon } from "@/components/admin-icon";
import {
  BULK_ACTION_CONFIGS,
  type BulkActionType,
  type BulkSelectedItem,
  type BulkOperationProgress,
  type BulkOperationResult,
} from "@/types/bulk-actions";

interface CubaBulkConfirmModalProps {
  isOpen: boolean;
  action: BulkActionType | null;
  items: BulkSelectedItem[];
  isProcessing: boolean;
  progress: BulkOperationProgress | null;
  result: BulkOperationResult | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function CubaBulkConfirmModal({
  isOpen,
  action,
  items,
  isProcessing,
  progress,
  result,
  onConfirm,
  onClose,
}: CubaBulkConfirmModalProps) {
  if (!isOpen || !action) return null;

  const config = BULK_ACTION_CONFIGS[action];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cuba-bulk-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-all">
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                action === "approve"
                  ? "bg-emerald-600"
                  : action === "publish"
                  ? "bg-sky-600"
                  : action === "archive"
                  ? "bg-slate-700"
                  : "bg-rose-600"
              }`}
            >
              <AdminIcon
                name={
                  action === "approve"
                    ? "check"
                    : action === "publish"
                    ? "eye"
                    : action === "archive"
                    ? "folder"
                    : "trash"
                }
                className="h-5 w-5 stroke-[2.5]"
              />
            </div>
            <div>
              <h3
                id="cuba-bulk-modal-title"
                className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
              >
                {config.confirmTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items.length} item akan diproses sekaligus
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tutup dialog"
            >
              <AdminIcon name="x" className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* State 1: Processing Progress */}
          {isProcessing && (
            <div className="space-y-3 py-3" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Memproses item...</span>
                <span>{progress ? `${Math.round(progress.percent)}%` : "0%"}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-300"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
              {progress && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Item {progress.current} dari {progress.total}: <strong className="text-slate-800 dark:text-slate-200">{progress.currentTitle}</strong>
                </p>
              )}
            </div>
          )}

          {/* State 2: Result Finished */}
          {result && !isProcessing && (
            <div className="space-y-3">
              <div
                className={`rounded-xl p-4 text-xs ${
                  result.failed === 0
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AdminIcon
                    name={result.failed === 0 ? "check" : "alert"}
                    className="h-4 w-4 stroke-[2.5]"
                  />
                  <span>
                    {result.failed === 0
                      ? `Seluruh ${result.succeeded} item berhasil diproses.`
                      : `${result.succeeded} berhasil, ${result.failed} gagal.`}
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-xs">
                    {result.errors.map((err) => (
                      <li key={err.id}>
                        <strong>{err.title}</strong>: {err.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* State 3: Confirmation Preview (Before execution) */}
          {!isProcessing && !result && (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {config.confirmDescription}
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Daftar Konten Terpilih ({items.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0"
                    >
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {item.title}
                      </span>
                      {item.currentStatus && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {item.currentStatus}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex items-center justify-end gap-2">
          {result ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-xs font-bold text-white dark:text-slate-900 shadow hover:opacity-90 transition-opacity"
            >
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={onConfirm}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${config.buttonClass}`}
              >
                {isProcessing ? "Memproses..." : "Konfirmasi & Jalankan"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
