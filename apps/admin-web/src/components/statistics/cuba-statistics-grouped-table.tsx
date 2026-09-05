"use client";

import { useMemo, useState } from "react";
import { AdminDataTable } from "@/components/admin-data-table";
import type {
  ContentDaily,
  CourseUtilization,
  PageDaily,
  SearchDaily,
  SSODaily,
} from "@/types/analytics";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

// =======================================================================
// 1. TABEL PENGUNJUNG & HALAMAN (GROUP BY PATH, SORT BY TANGGAL TERBARU)
// =======================================================================

export interface PathGroup {
  path: string;
  totalViews: number;
  totalUniqueVisitors: number;
  latestDate: string;
  daysCount: number;
  records: PageDaily[];
}

export function CubaTrafficGroupedTable({ data }: { data: PageDaily[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("latestDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group by path
  const groupedData: PathGroup[] = useMemo(() => {
    const map = new Map<string, PathGroup>();
    for (const item of data) {
      const existing = map.get(item.path);
      if (!existing) {
        map.set(item.path, {
          path: item.path,
          totalViews: item.views,
          totalUniqueVisitors: item.unique_visitors,
          latestDate: item.date,
          daysCount: 1,
          records: [item],
        });
      } else {
        existing.totalViews += item.views;
        existing.totalUniqueVisitors += item.unique_visitors;
        if (item.date > existing.latestDate) {
          existing.latestDate = item.date;
        }
        existing.daysCount += 1;
        existing.records.push(item);
      }
    }

    // Sort daily records within each group descending by date
    for (const group of map.values()) {
      group.records.sort((a, b) => b.date.localeCompare(a.date));
    }

    return Array.from(map.values());
  }, [data]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = groupedData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((g) => g.path.toLowerCase().includes(q));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "path") {
        cmp = a.path.localeCompare(b.path);
      } else if (sortKey === "latestDate") {
        cmp = a.latestDate.localeCompare(b.latestDate);
      } else if (sortKey === "views") {
        cmp = a.totalViews - b.totalViews;
      } else if (sortKey === "visitors") {
        cmp = a.totalUniqueVisitors - b.totalUniqueVisitors;
      } else if (sortKey === "days") {
        cmp = a.daysCount - b.daysCount;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [groupedData, searchQuery, sortKey, sortDirection]);

  // Pagination slice
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  // Selection handlers
  const allCurrentKeys = paginatedGroups.map((g) => g.path);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((k) => selectedPaths.has(k));
  const isSomeSelected =
    allCurrentKeys.some((k) => selectedPaths.has(k)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((k) => next.add(k));
      } else {
        allCurrentKeys.forEach((k) => next.delete(k));
      }
      return next;
    });
  };

  const handleToggleRow = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  return (
    <AdminDataTable
      title="Pengunjung & Halaman Terkelompok"
      description="Lalu lintas Portal publik dikelompokkan berdasarkan Path dan diurutkan berdasarkan tanggal aktivitas terbaru. Klik baris atau tombol untuk melihat rincian harian."
      itemCount={filteredAndSorted.length}
      headers={[
        { label: "", key: "expand" },
        { label: "Path Halaman", key: "path", sortable: true },
        { label: "Tanggal Terbaru", key: "latestDate", sortable: true },
        { label: "Total Tayangan", key: "views", sortable: true },
        { label: "Total Pengunjung Unik", key: "visitors", sortable: true },
        { label: "Hari Tercatat", key: "days", sortable: true },
        { label: "Aksi", key: "actions" },
      ]}
      emptyState="Belum ada data pengunjung untuk rentang waktu ini."
      searchQuery={searchQuery}
      onSearchChange={(q) => {
        setSearchQuery(q);
        setPage(1);
      }}
      searchPlaceholder="Cari path halaman…"
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      selectable={true}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onToggleSelectAll={handleToggleSelectAll}
      page={page}
      pageSize={pageSize}
      total={filteredAndSorted.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50]}
    >
      {paginatedGroups.map((group) => {
        const isExpanded = expandedPaths.has(group.path);
        const isChecked = selectedPaths.has(group.path);

        return (
          <tbody
            key={group.path}
            className="border-b border-slate-200 dark:border-slate-800 last:border-b-0"
          >
            <tr
              onClick={() => handleToggleExpand(group.path)}
              className={`cursor-pointer transition-colors hover:bg-sky-50/50 dark:hover:bg-slate-800/60 ${
                isExpanded
                  ? "bg-sky-50/30 dark:bg-slate-800/40"
                  : isChecked
                  ? "bg-slate-50/80 dark:bg-slate-800/30"
                  : ""
              }`}
            >
              {/* Checkbox */}
              <td
                className="w-10 px-4 py-3.5 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(group.path)}
                  aria-label={`Pilih path ${group.path}`}
                />
              </td>

              {/* Expand Trigger Icon */}
              <td className="w-10 px-2 py-3.5 text-center text-slate-400">
                <span
                  className={`inline-block transition-transform duration-200 ${
                    isExpanded ? "rotate-90 text-sky-600 dark:text-sky-400 font-bold" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▶
                </span>
              </td>

              {/* Path */}
              <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-sm xl:max-w-md" title={group.path}>
                    {group.path}
                  </span>
                </div>
              </td>

              {/* Latest Date */}
              <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {group.latestDate}
                </span>
              </td>

              {/* Total Views */}
              <td className="px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatNumber(group.totalViews)}
              </td>

              {/* Unique Visitors */}
              <td className="px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatNumber(group.totalUniqueVisitors)}
              </td>

              {/* Days Count */}
              <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                {group.daysCount} hari
              </td>

              {/* Action */}
              <td
                className="px-4 py-3.5 text-right text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleToggleExpand(group.path)}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "Tutup" : "Rincian"}
                </button>
              </td>
            </tr>

            {/* EXPANDED ACCORDION: DETAIL STATISTIK HARIAN */}
            {isExpanded && (
              <tr className="bg-slate-50/75 dark:bg-slate-900/75">
                <td colSpan={8} className="p-4 sm:p-5">
                  <div className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                          Rincian Harian Path: {group.path}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tercatat {group.records.length} rekaman harian, diurutkan dari tanggal terbaru.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                          Rata-rata:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {formatNumber(Math.round(group.totalViews / group.daysCount))} tayangan/hari
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="py-2 px-3 font-bold">Tanggal</th>
                            <th className="py-2 px-3 font-bold">Tayangan</th>
                            <th className="py-2 px-3 font-bold">Pengunjung Unik Harian</th>
                            <th className="py-2 px-3 font-bold">% Kontribusi Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.records.map((r) => {
                            const percentOfTotal =
                              group.totalViews > 0
                                ? ((r.views / group.totalViews) * 100).toFixed(1)
                                : "0";
                            return (
                              <tr
                                key={r.date}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                              >
                                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                                  {r.date}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                  {formatNumber(r.views)}
                                </td>
                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                  {formatNumber(r.unique_visitors)}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-sky-500 rounded-full"
                                        style={{ width: `${percentOfTotal}%` }}
                                      />
                                    </div>
                                    <span>{percentOfTotal}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </AdminDataTable>
  );
}

// =======================================================================
// 2. TABEL KONTEN TERKELOMPOK (GROUP BY TARGET / TYPE)
// =======================================================================

export interface ContentGroup {
  targetId: string;
  contentType: string;
  totalViews: number;
  totalUniqueVisitors: number;
  latestDate: string;
  daysCount: number;
  records: ContentDaily[];
}

export function CubaContentGroupedTable({ data }: { data: ContentDaily[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("latestDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group by target_id + content_type
  const groupedData: ContentGroup[] = useMemo(() => {
    const map = new Map<string, ContentGroup>();
    for (const item of data) {
      const key = `${item.content_type}:${item.target_id}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          targetId: item.target_id,
          contentType: item.content_type,
          totalViews: item.views,
          totalUniqueVisitors: item.unique_visitors,
          latestDate: item.date,
          daysCount: 1,
          records: [item],
        });
      } else {
        existing.totalViews += item.views;
        existing.totalUniqueVisitors += item.unique_visitors;
        if (item.date > existing.latestDate) {
          existing.latestDate = item.date;
        }
        existing.daysCount += 1;
        existing.records.push(item);
      }
    }

    for (const group of map.values()) {
      group.records.sort((a, b) => b.date.localeCompare(a.date));
    }

    return Array.from(map.values());
  }, [data]);

  const filteredAndSorted = useMemo(() => {
    let result = groupedData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.targetId.toLowerCase().includes(q) ||
          g.contentType.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "targetId") {
        cmp = a.targetId.localeCompare(b.targetId);
      } else if (sortKey === "contentType") {
        cmp = a.contentType.localeCompare(b.contentType);
      } else if (sortKey === "latestDate") {
        cmp = a.latestDate.localeCompare(b.latestDate);
      } else if (sortKey === "views") {
        cmp = a.totalViews - b.totalViews;
      } else if (sortKey === "visitors") {
        cmp = a.totalUniqueVisitors - b.totalUniqueVisitors;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [groupedData, searchQuery, sortKey, sortDirection]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const allCurrentKeys = paginatedGroups.map((g) => `${g.contentType}:${g.targetId}`);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((k) => selectedTargets.has(k));
  const isSomeSelected =
    allCurrentKeys.some((k) => selectedTargets.has(k)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((k) => next.add(k));
      } else {
        allCurrentKeys.forEach((k) => next.delete(k));
      }
      return next;
    });
  };

  const handleToggleRow = (key: string) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleToggleExpand = (key: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <AdminDataTable
      title="Statistik Konten Terkelompok"
      description="Metrik penayangan dikelompokkan menurut target dan jenis konten, terurut tanggal terbaru. Klik baris untuk melihat rincian harian."
      itemCount={filteredAndSorted.length}
      headers={[
        { label: "", key: "expand" },
        { label: "Jenis", key: "contentType", sortable: true },
        { label: "Target Konten", key: "targetId", sortable: true },
        { label: "Tanggal Terbaru", key: "latestDate", sortable: true },
        { label: "Total Tayangan", key: "views", sortable: true },
        { label: "Pengunjung Unik", key: "visitors", sortable: true },
        { label: "Hari Tercatat", key: "days" },
        { label: "Aksi", key: "actions" },
      ]}
      emptyState="Belum ada data konten untuk rentang waktu ini."
      searchQuery={searchQuery}
      onSearchChange={(q) => {
        setSearchQuery(q);
        setPage(1);
      }}
      searchPlaceholder="Cari target atau jenis konten…"
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={(k) => {
        if (sortKey === k) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        else {
          setSortKey(k);
          setSortDirection("desc");
        }
      }}
      selectable={true}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onToggleSelectAll={handleToggleSelectAll}
      page={page}
      pageSize={pageSize}
      total={filteredAndSorted.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50]}
    >
      {paginatedGroups.map((group) => {
        const key = `${group.contentType}:${group.targetId}`;
        const isExpanded = expandedTargets.has(key);
        const isChecked = selectedTargets.has(key);

        return (
          <tbody
            key={key}
            className="border-b border-slate-200 dark:border-slate-800 last:border-b-0"
          >
            <tr
              onClick={() => handleToggleExpand(key)}
              className={`cursor-pointer transition-colors hover:bg-sky-50/50 dark:hover:bg-slate-800/60 ${
                isExpanded
                  ? "bg-sky-50/30 dark:bg-slate-800/40"
                  : isChecked
                  ? "bg-slate-50/80 dark:bg-slate-800/30"
                  : ""
              }`}
            >
              <td
                className="w-10 px-4 py-3.5 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(key)}
                  aria-label={`Pilih konten ${group.targetId}`}
                />
              </td>
              <td className="w-10 px-2 py-3.5 text-center text-slate-400">
                <span
                  className={`inline-block transition-transform duration-200 ${
                    isExpanded ? "rotate-90 text-sky-600 dark:text-sky-400 font-bold" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▶
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs capitalize font-semibold text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold">
                  {group.contentType}
                </span>
              </td>
              <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                <span className="truncate max-w-xs inline-block" title={group.targetId}>
                  {group.targetId}
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {group.latestDate}
              </td>
              <td className="px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatNumber(group.totalViews)}
              </td>
              <td className="px-4 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatNumber(group.totalUniqueVisitors)}
              </td>
              <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                {group.daysCount} hari
              </td>
              <td
                className="px-4 py-3.5 text-right text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleToggleExpand(key)}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "Tutup" : "Rincian"}
                </button>
              </td>
            </tr>

            {isExpanded && (
              <tr className="bg-slate-50/75 dark:bg-slate-900/75">
                <td colSpan={8} className="p-4 sm:p-5">
                  <div className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-2">
                      Rincian Harian: {group.contentType} — {group.targetId}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="py-2 px-3 font-bold">Tanggal</th>
                            <th className="py-2 px-3 font-bold">Tayangan</th>
                            <th className="py-2 px-3 font-bold">Pengunjung Unik Harian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.records.map((r) => (
                            <tr
                              key={r.date}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                            >
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                                {r.date}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                {formatNumber(r.views)}
                              </td>
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                {formatNumber(r.unique_visitors)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </AdminDataTable>
  );
}

// =======================================================================
// 3. TABEL PENCARIAN & TEMUAN HARIAN (STANDAR DATATABLE & PAGINASI)
// =======================================================================

export function CubaSearchStatsTable({ data }: { data: SearchDaily[] }) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const allCurrentKeys = paginatedData.map((d) => d.date);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((k) => selectedDates.has(k));
  const isSomeSelected =
    allCurrentKeys.some((k) => selectedDates.has(k)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((k) => next.add(k));
      } else {
        allCurrentKeys.forEach((k) => next.delete(k));
      }
      return next;
    });
  };

  const handleToggleRow = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <AdminDataTable
      title="Rincian Pencarian Harian"
      description="Log pencarian harian tanpa raw query untuk menjaga privasi pengguna, terurut tanggal terbaru."
      itemCount={sortedData.length}
      headers={[
        { label: "Tanggal", key: "date" },
        { label: "Pencarian", key: "total_searches" },
        { label: "Hasil Kosong", key: "zero_results" },
        { label: "Klik Hasil", key: "result_clicks" },
      ]}
      emptyState="Belum ada data pencarian untuk periode ini."
      selectable={true}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onToggleSelectAll={handleToggleSelectAll}
      page={page}
      pageSize={pageSize}
      total={sortedData.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50]}
    >
      {paginatedData.map((row) => {
        const isChecked = selectedDates.has(row.date);
        return (
          <tr
            key={row.date}
            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
              isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
            }`}
          >
            <td className="w-10 px-4 py-3.5 text-center">
              <input
                type="checkbox"
                className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                checked={isChecked}
                onChange={() => handleToggleRow(row.date)}
                aria-label={`Pilih tanggal ${row.date}`}
              />
            </td>
            <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
              {row.date}
            </td>
            <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
              {formatNumber(row.total_searches)}
            </td>
            <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
              {formatNumber(row.zero_results)}
            </td>
            <td className="px-5 py-4 font-bold text-sky-700 dark:text-sky-400">
              {formatNumber(row.result_clicks)}
            </td>
          </tr>
        );
      })}
    </AdminDataTable>
  );
}

// =======================================================================
// 4. TABEL AUTENTIKASI SSO (STANDAR DATATABLE & PAGINASI)
// =======================================================================

export function CubaSsoStatsTable({ data }: { data: SSODaily[] }) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const allCurrentKeys = paginatedData.map((d) => d.date);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((k) => selectedDates.has(k));
  const isSomeSelected =
    allCurrentKeys.some((k) => selectedDates.has(k)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((k) => next.add(k));
      } else {
        allCurrentKeys.forEach((k) => next.delete(k));
      }
      return next;
    });
  };

  const handleToggleRow = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <AdminDataTable
      title="Rincian Autentikasi SSO Harian"
      description="Hasil login pengguna melalui SSO Keycloak, diurutkan dari tanggal terbaru."
      itemCount={sortedData.length}
      headers={[
        { label: "Tanggal", key: "date" },
        { label: "Login Berhasil", key: "success" },
        { label: "Login Gagal", key: "failed" },
      ]}
      emptyState="Belum ada data autentikasi untuk periode ini."
      selectable={true}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onToggleSelectAll={handleToggleSelectAll}
      page={page}
      pageSize={pageSize}
      total={sortedData.length}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50]}
    >
      {paginatedData.map((row) => {
        const isChecked = selectedDates.has(row.date);
        return (
          <tr
            key={row.date}
            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
              isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
            }`}
          >
            <td className="w-10 px-4 py-3.5 text-center">
              <input
                type="checkbox"
                className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                checked={isChecked}
                onChange={() => handleToggleRow(row.date)}
                aria-label={`Pilih tanggal ${row.date}`}
              />
            </td>
            <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
              {row.date}
            </td>
            <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(row.successful_logins)}
            </td>
            <td className="px-5 py-4 font-bold text-rose-600 dark:text-rose-400">
              {formatNumber(row.failed_logins)}
            </td>
          </tr>
        );
      })}
    </AdminDataTable>
  );
}

// =======================================================================
// 5. TABEL KURSUS PEMBELAJARAN TERATAS (STANDAR DATATABLE & PAGINASI)
// =======================================================================

export function CubaLearningCoursesTable({ courses }: { courses: CourseUtilization[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (courses || []).slice(start, start + pageSize);
  }, [courses, page, pageSize]);

  const allCurrentKeys = paginatedCourses.map((c) => c.course_id);
  const isAllSelected =
    allCurrentKeys.length > 0 &&
    allCurrentKeys.every((k) => selectedIds.has(k));
  const isSomeSelected =
    allCurrentKeys.some((k) => selectedIds.has(k)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((k) => next.add(k));
      } else {
        allCurrentKeys.forEach((k) => next.delete(k));
      }
      return next;
    });
  };

  const handleToggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminDataTable
      title="Kursus Teratas Moodle"
      description="Akses dan partisipasi unik pembelajar pada kursus formal."
      itemCount={courses?.length || 0}
      headers={[
        { label: "Kursus", key: "course_name" },
        { label: "Akses", key: "accesses" },
        { label: "Pembelajar Unik", key: "unique_learners" },
      ]}
      emptyState="Belum ada data kursus untuk periode ini."
      selectable={true}
      isAllSelected={isAllSelected}
      isSomeSelected={isSomeSelected}
      onToggleSelectAll={handleToggleSelectAll}
      page={page}
      pageSize={pageSize}
      total={courses?.length || 0}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      pageSizeOptions={[10, 25, 50]}
    >
      {paginatedCourses.map((course) => {
        const isChecked = selectedIds.has(course.course_id);
        return (
          <tr
            key={course.course_id}
            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
              isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
            }`}
          >
            <td className="w-10 px-4 py-3.5 text-center">
              <input
                type="checkbox"
                className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                checked={isChecked}
                onChange={() => handleToggleRow(course.course_id)}
                aria-label={`Pilih kursus ${course.course_name}`}
              />
            </td>
            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
              {course.course_name}
            </td>
            <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
              {formatNumber(course.accesses)}
            </td>
            <td className="px-5 py-4 font-bold text-sky-700 dark:text-sky-400">
              {formatNumber(course.unique_learners)}
            </td>
          </tr>
        );
      })}
    </AdminDataTable>
  );
}
