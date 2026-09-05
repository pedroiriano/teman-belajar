"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminClientPagination } from "@/components/admin-pagination";
import { AdminIcon } from "@/components/admin-icon";
import type { ReviewQueueItem } from "@/types/dashboard";

interface DashboardReviewQueueProps {
  items: ReviewQueueItem[];
}

const moduleLabels: Record<string, string> = {
  knowledge: "Pusat Pengetahuan",
  news: "Berita",
  announcements: "Pengumuman",
  faqs: "FAQ",
  microlearning: "Microlearning",
  training: "Program Pelatihan",
  learning_paths: "Jalur Belajar",
};

const moduleHrefs: Record<string, (id: string) => string> = {
  knowledge: (id) => `/dashboard/knowledge/${id}`,
  news: (id) => `/dashboard/news/${id}`,
  announcements: (id) => `/dashboard/announcements/${id}`,
  faqs: () => `/dashboard/faqs`,
  microlearning: () => `/dashboard/microlearning`,
  training: () => `/dashboard/training-programs`,
  learning_paths: () => `/dashboard/learning-paths`,
};

const statusBadgeClasses: Record<string, string> = {
  in_review:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  approved:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  published:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  draft:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const statusDisplayLabels: Record<string, string> = {
  in_review: "Menunggu peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  draft: "Draf",
};

export function DashboardReviewQueue({ items }: DashboardReviewQueueProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
      if (!matchesStatus) return false;

      if (!q) return true;
      const modLabel = moduleLabels[item.module] || item.module;
      return (
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        modLabel.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, statusFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let first: string | number = a[sortKey as keyof ReviewQueueItem] || "";
      let second: string | number = b[sortKey as keyof ReviewQueueItem] || "";

      if (sortKey === "updated_at") {
        first = new Date(a.updated_at).getTime();
        second = new Date(b.updated_at).getTime();
      }

      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const headers = [
    { key: "title", label: "Konten", sortable: true },
    { key: "module", label: "Modul", sortable: true },
    { key: "author", label: "Penanggung Jawab", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "updated_at", label: "Terakhir Diperbarui", sortable: true },
    { label: "Aksi", sortable: false },
  ];

  const statusOptions = [
    { value: "all", label: "Semua status" },
    { value: "in_review", label: "Menunggu peninjauan" },
    { value: "approved", label: "Disetujui" },
  ];

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every((it) => selectedKeys.has(`${it.module}-${it.id}`));
  const isSomeSelected = selectedKeys.size > 0 && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(paginatedItems.map((it) => `${it.module}-${it.id}`)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleToggleRow = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  return (
    <section className="space-y-4" aria-labelledby="review-queue-title">
      {selectedKeys.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3 px-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
            <AdminIcon name="check" className="h-4 w-4 text-sky-600" />
            <span>{selectedKeys.size} item terpilih untuk peninjauan</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedKeys(new Set())}
            className="font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Batal pilih
          </button>
        </div>
      )}
      <AdminDataTable
        title="Antrean Peninjauan Lintas Modul"
        description="Daftar konten yang membutuhkan peninjauan atau persetujuan editor."
        itemCount={filteredItems.length}
        headers={headers}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Cari judul, modul, atau author…"
        statusFilter={statusFilter}
        statusOptions={statusOptions}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        responsiveCards={true}
        emptyState="Tidak ada konten dalam antrean peninjauan saat ini."
        actions={
          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            {items.length} item menunggu keputusan
          </span>
        }
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        page={currentPage}
        pageSize={pageSize}
        total={filteredItems.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={[5, 10, 25]}
      >
        {paginatedItems.map((item) => {
          const itemKey = `${item.module}-${item.id}`;
          const isChecked = selectedKeys.has(itemKey);
          const modLabel = moduleLabels[item.module] || item.module;
          const hrefBuilder = moduleHrefs[item.module] || (() => `/dashboard`);
          const href = hrefBuilder(item.id);
          const formattedDate = new Date(item.updated_at).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <tr
              key={itemKey}
              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(itemKey)}
                  aria-label={`Pilih konten ${item.title}`}
                />
              </td>
              <td data-label="Konten" className="px-5 py-4">
                <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                <div className="text-xs text-slate-400">ID: {item.id.slice(0, 8)}…</div>
              </td>
              <td data-label="Modul" className="px-5 py-4">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {modLabel}
                </span>
              </td>
              <td data-label="Penanggung Jawab" className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                {item.author || "Sistem"}
              </td>
              <td data-label="Status" className="px-5 py-4">
                <span className={statusBadgeClasses[item.status] || statusBadgeClasses.draft}>
                  {statusDisplayLabels[item.status] || item.status}
                </span>
              </td>
              <td data-label="Terakhir Diperbarui" className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                {formattedDate}
              </td>
              <td data-label="Aksi" className="px-5 py-4">
                <Link
                  href={href}
                  className="admin-button-secondary !min-h-8 !px-3 !py-1 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400"
                >
                  Tinjau <AdminIcon name="arrow" className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>
    </section>
  );
}
