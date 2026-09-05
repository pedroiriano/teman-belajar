"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminIcon } from "@/components/admin-icon";
import { MediaPreviewImage } from "@/components/media/MediaPreviewImage";
import type { MediaAsset } from "@/components/media/types";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface CubaMediaTableProps {
  mediaAssets: MediaAsset[];
  itemCount: number;
  canUpload: boolean;
  errorMessage?: string | null;
  paginationSlot?: React.ReactNode;
}

export function CubaMediaTable({
  mediaAssets,
  itemCount,
  canUpload,
  errorMessage,
  paginationSlot,
}: CubaMediaTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedMediaAssets = useMemo(() => {
    return [...mediaAssets].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "details") {
        const nameA = a.display_filename || a.original_filename || a.title || "";
        const nameB = b.display_filename || b.original_filename || b.title || "";
        comparison = nameA.localeCompare(nameB, "id");
      } else if (sortKey === "size") {
        comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
      } else if (sortKey === "created_at") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = timeA - timeB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [mediaAssets, sortKey, sortDirection]);

  const isAllSelected = mediaAssets.length > 0 && selectedIds.size === mediaAssets.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < mediaAssets.length;

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(mediaAssets.map((asset) => asset.id)));
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

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3 px-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
            <AdminIcon name="check" className="h-4 w-4 text-sky-600" />
            <span>{selectedIds.size} media dipilih dari {mediaAssets.length} di halaman ini</span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Batal pilih
          </button>
        </div>
      )}

      <AdminDataTable
        title="Daftar aset"
        description="Metadata, ukuran, dan status penyimpanan media"
        itemCount={itemCount}
        headers={[
          { label: "Pratinjau", key: "preview" },
          { label: "Detail berkas", key: "details", sortable: true },
          { label: "Ukuran", key: "size", sortable: true },
          { label: "Dibuat", key: "created_at", sortable: true },
          { label: "Aksi", key: "actions" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        emptyState={
          canUpload ? "Belum ada media. Silakan unggah berkas baru." : "Belum ada media yang dapat ditinjau."
        }
        error={errorMessage}
        retryHref="/dashboard/media"
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        paginationSlot={paginationSlot}
      >
        {sortedMediaAssets.map((asset) => {
          const isChecked = selectedIds.has(asset.id);
          return (
            <tr
              key={asset.id}
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(asset.id)}
                  aria-label={`Pilih media ${asset.display_filename || asset.original_filename}`}
                />
              </td>
              <td className="p-4" data-label="Pratinjau">
                {asset.detected_mime_type.startsWith("image/") ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    <MediaPreviewImage
                      src={`/api/bff/media/${asset.id}/content`}
                      alt={asset.alt_text || asset.display_filename || asset.original_filename || "Pratinjau media"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                    {asset.detected_mime_type.split("/")[1]?.toUpperCase().substring(0, 4) || "FILE"}
                  </div>
                )}
              </td>
              <td className="p-4" data-label="Detail berkas">
                <div
                  className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]"
                  title={asset.display_filename || asset.original_filename || undefined}
                >
                  {asset.display_filename || asset.original_filename || asset.title || "Tanpa Judul"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col gap-1">
                  <span>{asset.detected_mime_type}</span>
                  <span
                    className={`cuba-badge w-fit ${
                      asset.status === "active"
                        ? "cuba-badge-success"
                        : "cuba-badge-neutral"
                    }`}
                  >
                    {asset.status === "active" ? "Aktif" : asset.status === "archived" ? "Diarsipkan" : asset.status}
                  </span>
                </div>
              </td>
              <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Ukuran">
                {formatBytes(asset.size_bytes)}
              </td>
              <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Dibuat">
                {asset.created_at ? new Date(asset.created_at).toLocaleDateString("id-ID") : "-"}
              </td>
              <td className="p-4 text-xs font-semibold" data-label="Aksi">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/media/${asset.id}`}
                    className="font-bold text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    {canUpload ? "Kelola" : "Lihat"}
                  </Link>
                  {asset.status === "active" && (
                    <a
                      href={`/api/bff/media/${asset.id}/content`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Buka
                    </a>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>
    </div>
  );
}