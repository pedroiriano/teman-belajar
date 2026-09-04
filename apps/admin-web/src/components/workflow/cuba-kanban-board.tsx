"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminIcon } from "@/components/admin-icon";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminClientPagination } from "@/components/admin-pagination";
import type { WorkflowItem, WorkflowColumn } from "@/types/workflow";

interface CubaKanbanBoardProps {
  initialItems: WorkflowItem[];
}

const columns: WorkflowColumn[] = [
  {
    id: "draft",
    title: "Draf",
    description: "Materi baru yang sedang disusun",
    accentClass: "border-t-slate-400 text-slate-700 dark:text-slate-300",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    emptyText: "Tidak ada draf aktif",
  },
  {
    id: "in_review",
    title: "Menunggu Peninjauan",
    description: "Membutuhkan evaluasi peninjau",
    accentClass: "border-t-yellow-500 text-yellow-800 dark:text-yellow-400",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
    emptyText: "Tidak ada antrean tinjauan",
  },
  {
    id: "approved",
    title: "Disetujui",
    description: "Lolos tinjauan dan siap terbit",
    accentClass: "border-t-sky-500 text-sky-800 dark:text-sky-400",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
    emptyText: "Belum ada konten disetujui",
  },
  {
    id: "published",
    title: "Terbit",
    description: "Tersedia aktif bagi pembelajar",
    accentClass: "border-t-emerald-500 text-emerald-800 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    emptyText: "Belum ada konten terbit",
  },
  {
    id: "archived",
    title: "Arsip",
    description: "Disimpan sebagai riwayat organisasi",
    accentClass: "border-t-zinc-500 text-zinc-700 dark:text-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    emptyText: "Belum ada arsip",
  },
];

const moduleLabels: Record<string, string> = {
  knowledge: "Pengetahuan",
  news: "Berita",
  announcements: "Pengumuman",
  faqs: "FAQ",
  microlearning: "Microlearning",
  training: "Pelatihan",
  learning_paths: "Jalur Belajar",
};

const moduleBadgeClasses: Record<string, string> = {
  knowledge: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  news: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  announcements: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  faqs: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  microlearning: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  training: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  learning_paths: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
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

export function CubaKanbanBoard({ initialItems }: CubaKanbanBoardProps) {
  const [items] = useState<WorkflowItem[]>(initialItems);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesModule = moduleFilter === "all" || item.module === moduleFilter;
      if (!matchesModule) return false;

      if (!q) return true;
      const modLabel = moduleLabels[item.module] || item.module;
      return (
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        modLabel.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [items, moduleFilter, searchQuery]);

  const columnsData = useMemo(() => {
    return columns.map((col) => {
      const colItems = filteredItems.filter((item) => item.status === col.id);
      return {
        ...col,
        items: colItems,
        count: colItems.length,
      };
    });
  }, [filteredItems]);

  const listSortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let first: string | number = a[sortKey as keyof WorkflowItem] || "";
      let second: string | number = b[sortKey as keyof WorkflowItem] || "";

      if (sortKey === "updated_at") {
        first = new Date(a.updated_at).getTime();
        second = new Date(b.updated_at).getTime();
      }

      if (first < second) return sortDirection === "asc" ? -1 : 1;
      if (first > second) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortKey, sortDirection]);

  const totalListPages = Math.max(1, Math.ceil(listSortedItems.length / listPageSize));
  const currentListPage = Math.min(listPage, totalListPages);
  const paginatedListItems = useMemo(() => {
    const start = (currentListPage - 1) * listPageSize;
    return listSortedItems.slice(start, start + listPageSize);
  }, [listSortedItems, currentListPage, listPageSize]);

  const tableHeaders = [
    { key: "title", label: "Konten", sortable: true },
    { key: "module", label: "Modul", sortable: true },
    { key: "author", label: "Penanggung Jawab", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "updated_at", label: "Terakhir Diperbarui", sortable: true },
    { label: "Aksi", sortable: false },
  ];

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="admin-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
              <AdminIcon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search"
              className="admin-input !h-9 pl-9 text-xs"
              placeholder="Cari judul, modul, atau author…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setListPage(1);
              }}
              aria-label="Cari item alur kerja"
            />
          </div>

          <label className="text-xs">
            <span className="sr-only">Filter Modul</span>
            <select
              className="admin-input !h-9 !w-auto !py-1 text-xs"
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setListPage(1);
              }}
              aria-label="Filter berdasarkan modul"
            >
              <option value="all">Semua Modul ({items.length})</option>
              <option value="knowledge">Pusat Pengetahuan</option>
              <option value="news">Berita</option>
              <option value="announcements">Pengumuman</option>
              <option value="faqs">FAQ</option>
              <option value="microlearning">Microlearning</option>
              <option value="training">Program Pelatihan</option>
              <option value="learning_paths">Jalur Belajar</option>
            </select>
          </label>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Tampilan:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                viewMode === "board"
                  ? "bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <AdminIcon name="dashboard" className="h-3.5 w-3.5" />
              Papan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <AdminIcon name="file" className="h-3.5 w-3.5" />
              Daftar
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Kanban Board View */}
      {viewMode === "board" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {columnsData.map((col) => (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30"
            >
              {/* Column Header */}
              <div className={`border-t-4 ${col.accentClass} pb-3 pt-2`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{col.title}</h3>
                  <span
                    className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-black ${col.badgeClass}`}
                  >
                    {col.count}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{col.description}</p>
              </div>

              {/* Cards Container */}
              <div className="mt-2 flex-1 space-y-3">
                {col.items.length === 0 ? (
                  <div className="grid h-36 place-items-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                    {col.emptyText}
                  </div>
                ) : (
                  col.items.map((item) => {
                    const modLabel = moduleLabels[item.module] || item.module;
                    const badgeClass = moduleBadgeClasses[item.module] || "bg-slate-100 text-slate-700";
                    const hrefBuilder = moduleHrefs[item.module] || (() => `/dashboard`);
                    const href = hrefBuilder(item.id);
                    const formattedDate = new Date(item.updated_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <article
                        key={`${item.module}-${item.id}`}
                        className="admin-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}
                          >
                            {modLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">ID: {item.id.slice(0, 6)}</span>
                        </div>

                        <h4 className="mt-2.5 line-clamp-2 text-xs font-bold leading-5 text-slate-900 dark:text-white">
                          {item.title}
                        </h4>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800">
                          <span className="truncate max-w-[110px]">{item.author || "Sistem"}</span>
                          <span>{formattedDate}</span>
                        </div>

                        <div className="mt-3">
                          <Link
                            href={href}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-sky-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400 dark:hover:bg-slate-700"
                          >
                            Buka modul <AdminIcon name="arrow" className="ml-1 h-3 w-3" />
                          </Link>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode 2: Alternative List/Table View */
        <div className="space-y-4">
          <AdminDataTable
            title="Daftar Alur Kerja Terpadu"
            description={`Menampilkan ${filteredItems.length} konten lintas modul dan siklus editorial.`}
            itemCount={filteredItems.length}
            headers={tableHeaders}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key) => {
              if (sortKey === key) {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
              } else {
                setSortKey(key);
                setSortDirection("asc");
              }
              setListPage(1);
            }}
            responsiveCards={true}
            emptyState="Tidak ada item yang sesuai dengan kriteria pencarian atau filter."
          >
            {paginatedListItems.map((item) => {
              const modLabel = moduleLabels[item.module] || item.module;
              const hrefBuilder = moduleHrefs[item.module] || (() => `/dashboard`);
              const href = hrefBuilder(item.id);
              const formattedDate = new Date(item.updated_at).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <tr key={`${item.module}-${item.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
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
                  <td data-label="Status" className="px-5 py-4 text-xs font-bold uppercase tracking-wider">
                    {item.status}
                  </td>
                  <td data-label="Terakhir Diperbarui" className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {formattedDate}
                  </td>
                  <td data-label="Aksi" className="px-5 py-4">
                    <Link
                      href={href}
                      className="admin-button-secondary !min-h-8 !px-3 !py-1 text-xs font-bold text-sky-700 hover:text-sky-800 dark:text-sky-400"
                    >
                      Buka <AdminIcon name="arrow" className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </AdminDataTable>

          {filteredItems.length > 0 && (
            <AdminClientPagination
              page={currentListPage}
              pages={totalListPages}
              total={filteredItems.length}
              pageSize={listPageSize}
              onPageChange={setListPage}
              onPageSizeChange={(size) => {
                setListPageSize(size);
                setListPage(1);
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          )}
        </div>
      )}
    </div>
  );
}
