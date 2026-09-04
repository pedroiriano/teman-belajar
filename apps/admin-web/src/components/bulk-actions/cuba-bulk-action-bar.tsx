"use client";

import React from "react";
import { AdminIcon } from "@/components/admin-icon";
import { BULK_ACTION_CONFIGS, type BulkActionType } from "@/types/bulk-actions";

interface CubaBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onActionClick: (action: BulkActionType) => void;
  onClearSelection: () => void;
  disabled?: boolean;
  allowedActions?: BulkActionType[];
}

export function CubaBulkActionBar({
  selectedCount,
  totalCount,
  onActionClick,
  onClearSelection,
  disabled = false,
  allowedActions = ["approve", "publish", "archive", "delete"],
}: CubaBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <aside
      aria-label="Bilah Aksi Massal"
      className="cuba-bulk-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 sm:p-4 shadow-2xl backdrop-blur-md">
        {/* Left: Counter badge & info */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80 shadow-sm">
            <AdminIcon name="check" className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {selectedCount} item dipilih
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                dari {totalCount} total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Pilih tindakan alur kerja untuk diproses sekaligus.
            </p>
          </div>
        </div>

        {/* Right: Action buttons & Clear */}
        <div className="flex flex-wrap items-center gap-2">
          {allowedActions.includes("approve") && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActionClick("approve")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
            >
              <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{BULK_ACTION_CONFIGS.approve.label}</span>
            </button>
          )}

          {allowedActions.includes("publish") && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActionClick("publish")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
            >
              <AdminIcon name="eye" className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{BULK_ACTION_CONFIGS.publish.label}</span>
            </button>
          )}

          {allowedActions.includes("archive") && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActionClick("archive")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
            >
              <AdminIcon name="folder" className="h-3.5 w-3.5 stroke-[2]" />
              <span>{BULK_ACTION_CONFIGS.archive.label}</span>
            </button>

          )}

          {allowedActions.includes("delete") && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onActionClick("delete")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
            >
              <AdminIcon name="trash" className="h-3.5 w-3.5 stroke-[2]" />
              <span>{BULK_ACTION_CONFIGS.delete.label}</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <button
            type="button"
            disabled={disabled}
            onClick={onClearSelection}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none disabled:opacity-50 transition-colors"
          >
            <AdminIcon name="x" className="h-3.5 w-3.5 stroke-[2]" />
            <span>Batalkan</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
