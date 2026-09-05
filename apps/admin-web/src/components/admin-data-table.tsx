import type { ReactNode } from "react";
import Link from "next/link";
import { AdminIcon } from "@/components/admin-icon";
import { AdminClientPagination } from "@/components/admin-pagination";

export interface ColumnHeader {
  key?: string;
  label: string;
  sortable?: boolean;
  className?: string;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface AdminDataTableProps {
  title: string;
  description?: string;
  itemCount: number;
  headers: (string | ColumnHeader)[];
  children?: ReactNode;
  emptyState?: string;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  retryHref?: string;
  // Cuba DataTables enhancements
  actions?: ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  statusOptions?: (string | { value: string; label: string })[];
  onStatusFilterChange?: (status: string) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;
  freshnessText?: string;
  responsiveCards?: boolean;
  // Cuba Bulk Selection
  selectable?: boolean;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onToggleSelectAll?: (checked: boolean) => void;
  bulkActionBar?: ReactNode;
  // Cuba Pagination & Count Utilities
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  paginationSlot?: ReactNode;
}

export function AdminDataTable({
  title,
  description,
  itemCount,
  headers,
  children,
  emptyState = "Belum ada data.",
  loading = false,
  error,
  compact = false,
  retryHref,
  actions,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Cari di tabel…",
  statusFilter,
  statusOptions,
  onStatusFilterChange,
  sortKey,
  sortDirection = "asc",
  onSortChange,
  freshnessText,
  responsiveCards = true,
  selectable = false,
  isAllSelected = false,
  isSomeSelected = false,
  onToggleSelectAll,
  bulkActionBar,
  page,
  pageSize = 10,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  paginationSlot,
}: AdminDataTableProps) {
  const tableId = `table-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const normalizedHeaders: ColumnHeader[] = headers.map((h) =>
    typeof h === "string" ? { label: h } : h
  );


  const hasToolbarControls = Boolean(
    onSearchChange || onStatusFilterChange || actions || freshnessText
  );

  return (
    <section
      className="cuba-data-table admin-table-shell rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
      aria-labelledby={tableId}
    >
      {compact ? (
        <h2 id={tableId} className="sr-only">
          {title}
        </h2>
      ) : (
        <div className="admin-table-toolbar border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2
                  id={tableId}
                  className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  {title}
                </h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                  {itemCount} data
                </span>
              </div>
              {description && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>

          {hasToolbarControls && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {onSearchChange && (
                  <div className="relative min-w-[200px] max-w-sm flex-1">
                    <AdminIcon
                      name="search"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={searchQuery ?? ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="admin-input !h-9 !py-1 !pl-9 text-xs"
                      aria-label="Cari data di tabel"
                    />
                  </div>
                )}
                {onStatusFilterChange && statusOptions && statusOptions.length > 0 && (
                  <select
                    value={statusFilter ?? "all"}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="admin-input !h-9 !w-auto !py-1 text-xs"
                    aria-label="Filter status tabel"
                  >
                    <option value="all">Semua status</option>
                    {statusOptions.map((opt) => {
                      const val = typeof opt === "string" ? opt : opt.value;
                      const lbl = typeof opt === "string" ? opt : opt.label;
                      return (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              {freshnessText && (
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {freshnessText}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className={`cuba-table admin-table w-full border-collapse text-left ${
            responsiveCards ? "cuba-table-responsive-cards" : ""
          }`}
        >
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {selectable && (
                <th
                  scope="col"
                  className="w-10 px-4 py-3 text-center"
                >
                  <input
                    type="checkbox"
                    className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    checked={Boolean(isAllSelected)}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = Boolean(isSomeSelected && !isAllSelected);
                      }
                    }}
                    onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                    aria-label="Pilih semua baris"
                  />
                </th>
              )}
              {normalizedHeaders.map((col, idx) => {
                const isSortable = Boolean(col.sortable && col.key && onSortChange);
                const isSorted = isSortable && sortKey === col.key;
                const widthClass = col.width ? col.width : "";
                const alignClass =
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                    ? "text-right"
                    : "";
                const baseClass = "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";
                const thClass = `${baseClass} ${widthClass} ${alignClass} ${col.className || ""}`.trim();
                return (
                  <th
                    key={col.key || `${col.label}-${idx}`}
                    scope="col"
                    className={thClass}
                    aria-sort={
                      isSorted
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange!(col.key!)}
                        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${
                          col.align === "right"
                            ? "justify-end"
                            : col.align === "center"
                            ? "justify-center"
                            : ""
                        }`}
                        aria-label={`Urutkan berdasarkan ${col.label}`}
                      >
                        <span>{col.label}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500" aria-hidden="true">
                          {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : col.label ? (
                      col.label
                    ) : (
                      <span className="sr-only">{col.key || "Kolom Kontrol"}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={normalizedHeaders.length + (selectable ? 1 : 0)} className="p-8 text-center">
                  <div className="mx-auto max-w-sm space-y-3" role="status">
                    <div className="h-4 w-3/4 mx-auto animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-1/2 mx-auto animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-5/6 mx-auto animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Memuat data…
                    </p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={normalizedHeaders.length + (selectable ? 1 : 0)}
                  className="p-8 text-center text-rose-700 dark:text-rose-400"
                  role="alert"
                >
                  <p className="font-semibold text-sm">{error}</p>
                  {retryHref && (
                    <Link
                      className="mt-3 inline-flex text-xs font-bold underline hover:no-underline"
                      href={retryHref}
                    >
                      Coba lagi
                    </Link>
                  )}
                </td>
              </tr>
            ) : itemCount === 0 ? (
              <tr>
                <td
                  colSpan={normalizedHeaders.length + (selectable ? 1 : 0)}
                  className="p-10 text-center"
                >
                  <div className="mx-auto max-w-sm flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <AdminIcon name="file" className="h-8 w-8 mb-2 stroke-[1.5] text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{emptyState}</p>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {bulkActionBar}
      {paginationSlot ? (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
          {paginationSlot}
        </div>
      ) : page && onPageChange ? (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
          <AdminClientPagination
            page={page}
            pages={Math.max(1, Math.ceil((total ?? itemCount) / pageSize))}
            total={total ?? itemCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={pageSizeOptions}
          />
        </div>
      ) : null}
    </section>
  );
}
