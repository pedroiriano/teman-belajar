"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminDataTable, type ColumnHeader } from "@/components/admin-data-table";
import { AdminIcon } from "@/components/admin-icon";

export interface AuditItem {
  id: string;
  actor_user_id?: string;
  event: string;
  module: string;
  target_type: string;
  target_id: string;
  result: string;
  correlation_id?: string;
  ip_masked?: string;
  metadata?: Record<string, string>;
  occurred_at: string;
}

interface CubaAuditTableProps {
  items: AuditItem[];
  canExport: boolean;
  exportHref?: string;
  nextHref?: string;
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Waktu tidak valid"
    : date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function resultBadgeStyle(result: string) {
  const upper = result.toUpperCase();
  if (upper === "SUCCESS") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50";
  }
  if (upper === "DENIED" || upper === "FAILED" || upper === "FAILURE") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
}

const tableHeaders: ColumnHeader[] = [
  { label: "Waktu", key: "occurred_at", sortable: true },
  { label: "Event / Modul", key: "event", sortable: true },
  { label: "Actor", key: "actor_user_id", sortable: true },
  { label: "Target", key: "target_id", sortable: true },
  { label: "Hasil", key: "result", sortable: true },
  { label: "Aksi" },
];

export function CubaAuditTable({
  items,
  canExport,
  exportHref,
  nextHref,
}: CubaAuditTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("occurred_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (statusFilter !== "all") {
      const filterUpper = statusFilter.toUpperCase();
      result = result.filter((item) => item.result.toUpperCase() === filterUpper);
    }

    // Live search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.event.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q) ||
          (item.actor_user_id && item.actor_user_id.toLowerCase().includes(q)) ||
          item.target_type.toLowerCase().includes(q) ||
          item.target_id.toLowerCase().includes(q) ||
          item.result.toLowerCase().includes(q) ||
          (item.correlation_id && item.correlation_id.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "occurred_at") {
        comparison = new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
      } else if (sortKey === "event") {
        comparison = a.event.localeCompare(b.event);
      } else if (sortKey === "actor_user_id") {
        comparison = (a.actor_user_id || "").localeCompare(b.actor_user_id || "");
      } else if (sortKey === "target_id") {
        comparison = (a.target_id || "").localeCompare(b.target_id || "");
      } else if (sortKey === "result") {
        comparison = a.result.localeCompare(b.result);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, statusFilter, sortKey, sortDirection]);

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {canExport && exportHref ? (
        <Link
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <AdminIcon name="file" className="h-3.5 w-3.5" />
          <span>Ekspor CSV</span>
        </Link>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
          title="Isi parameter 'Dari' dan 'Sampai' pada filter di atas untuk mengaktifkan ekspor CSV"
        >
          <AdminIcon name="file" className="h-3.5 w-3.5" />
          <span>Ekspor perlu rentang tanggal</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <AdminDataTable
        title="Catatan Audit Sistem"
        description="Audit trail tersanitasi dengan retention 365 hari. Maksimal 25 catatan per halaman dengan cursor deterministik."
        itemCount={filteredAndSortedItems.length}
        headers={tableHeaders}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari event, modul, actor, target…"
        statusFilter={statusFilter}
        statusOptions={[
          { value: "all", label: "Semua Hasil" },
          { value: "SUCCESS", label: "SUCCESS" },
          { value: "DENIED", label: "DENIED" },
          { value: "FAILED", label: "FAILED" },
        ]}
        onStatusFilterChange={setStatusFilter}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        actions={headerActions}
        emptyState="Tidak ada catatan audit yang sesuai dengan filter atau kriteria pencarian."
        responsiveCards={true}
      >
        {filteredAndSortedItems.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
          >
            <td
              data-label="Waktu"
              className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-700 dark:text-slate-200"
            >
              <time dateTime={item.occurred_at}>{formatAuditTime(item.occurred_at)}</time>
            </td>
            <td data-label="Event / Modul" className="px-4 py-3.5">
              <strong className="block text-xs font-bold text-slate-900 dark:text-white">
                {item.event}
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.module}</span>
            </td>
            <td
              data-label="Actor"
              className="max-w-44 break-all px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300"
            >
              {item.actor_user_id || "Sistem"}
            </td>
            <td data-label="Target" className="px-4 py-3.5">
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {item.target_type}
              </span>
              <span className="break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                {item.target_id}
              </span>
            </td>
            <td data-label="Hasil" className="px-4 py-3.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${resultBadgeStyle(
                  item.result
                )}`}
              >
                {item.result}
              </span>
            </td>
            <td data-label="Aksi" className="px-4 py-3.5 text-right sm:text-left">
              <Link
                className="inline-flex items-center gap-1 font-bold text-xs text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200 hover:underline"
                href={`/dashboard/audit/${item.id}`}
              >
                <span>Detail</span>
                <AdminIcon name="arrow" className="h-3 w-3" />
              </Link>
            </td>
          </tr>
        ))}
      </AdminDataTable>

      {/* Pagination Footer */}
      {nextHref && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {filteredAndSortedItems.length}
            </span>{" "}
            dari {items.length} catatan pada halaman ini
          </p>
          <Link
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            href={nextHref}
          >
            <span>Halaman berikutnya</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
