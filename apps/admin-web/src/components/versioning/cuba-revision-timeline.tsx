"use client";

import React from "react";
import { AdminIcon } from "@/components/admin-icon";
import type { ContentRevision } from "@/types/content-versioning";

interface CubaRevisionTimelineProps {
  revisions: ContentRevision[];
  selectedBaseRev: number;
  selectedCompareRev: number;
  onSelectBaseRev: (revNo: number) => void;
  onSelectCompareRev: (revNo: number) => void;
  onRollback: (revNo: number) => void;
  isRollbackLoading: boolean;
}

export function CubaRevisionTimeline({
  revisions,
  selectedBaseRev,
  selectedCompareRev,
  onSelectBaseRev,
  onSelectCompareRev,
  onRollback,
  isRollbackLoading,
}: CubaRevisionTimelineProps) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
        <AdminIcon name="clock" className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm font-semibold">Belum ada riwayat revisi untuk konten ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revision Comparison Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 p-4">
        <div className="flex items-center gap-2">
          <AdminIcon name="filter" className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Pilih Versi untuk Dibandingkan:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <span>Dasar (Asal):</span>
            <select
              value={selectedBaseRev}
              onChange={(e) => onSelectBaseRev(Number(e.target.value))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {revisions.map((rev) => (
                <option key={`base-${rev.revisionNo}`} value={rev.revisionNo}>
                  Revisi #{rev.revisionNo} {rev.isCurrent ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </label>

          <span className="text-slate-400">&rarr;</span>

          <label className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <span>Tujuan:</span>
            <select
              value={selectedCompareRev}
              onChange={(e) => onSelectCompareRev(Number(e.target.value))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {revisions.map((rev) => (
                <option key={`comp-${rev.revisionNo}`} value={rev.revisionNo}>
                  Revisi #{rev.revisionNo} {rev.isCurrent ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {revisions.map((rev) => {
          const isBase = rev.revisionNo === selectedBaseRev;
          const isCompare = rev.revisionNo === selectedCompareRev;

          return (
            <div key={rev.id} className="relative group">
              {/* Timeline Bullet */}
              <div
                className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                  rev.isCurrent
                    ? "border-sky-600 bg-sky-600 text-white"
                    : rev.isPublished
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400"
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-current" />
              </div>

              {/* Revision Card */}
              <div
                className={`rounded-2xl border p-4 transition-all ${
                  isBase || isCompare
                    ? "border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Revisi #{rev.revisionNo}
                      </span>
                      {rev.isCurrent && (
                        <span className="rounded-md bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:text-sky-300">
                          Versi Aktif
                        </span>
                      )}
                      {rev.isPublished && (
                        <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          Terbit
                        </span>
                      )}
                      {isBase && (
                        <span className="rounded-md bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Dipilih sebagai Dasar
                        </span>
                      )}
                      {isCompare && (
                        <span className="rounded-md bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Dipilih sebagai Tujuan
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>Oleh: {rev.authorName || "Staf Editorial"}</span>
                      <span>&bull;</span>
                      <span>
                        {new Date(rev.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectBaseRev(rev.revisionNo)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                      title="Tetapkan revisi ini sebagai versi pembanding dasar"
                    >
                      Bandingkan
                    </button>
                    {!rev.isCurrent && (
                      <button
                        type="button"
                        disabled={isRollbackLoading}
                        onClick={() => onRollback(rev.revisionNo)}
                        className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors disabled:opacity-50 flex items-center gap-1"
                        title="Pulihkan isi artikel ke versi ini"
                      >
                        <AdminIcon name="refresh" className="h-3 w-3" />
                        Pulihkan
                      </button>
                    )}
                  </div>
                </div>

                {/* Excerpt / Summary preview */}
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 p-2.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-mono">
                  {rev.body.slice(0, 200)}...
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
