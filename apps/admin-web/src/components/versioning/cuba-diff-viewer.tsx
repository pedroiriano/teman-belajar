"use client";

import React, { useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { buildSideBySideRows } from "@/lib/diff/diff-engine";
import type { DiffResult } from "@/types/content-versioning";

interface CubaDiffViewerProps {
  diffResult: DiffResult;
  baseRevisionTitle?: string;
  compareRevisionTitle?: string;
}

export function CubaDiffViewer({
  diffResult,
  baseRevisionTitle,
  compareRevisionTitle,
}: CubaDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");

  const sideBySideRows = React.useMemo(() => {
    return buildSideBySideRows(diffResult.lines);
  }, [diffResult.lines]);

  const { addedCount, removedCount, unchangedCount } = diffResult.summary;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Diff Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm font-bold">
            <AdminIcon name="code" className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Perbandingan: Revisi #{diffResult.baseRevisionNo} &rarr; Revisi #{diffResult.compareRevisionNo}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {baseRevisionTitle ? `Dasar: ${baseRevisionTitle}` : ""}
              {compareRevisionTitle ? ` vs ${compareRevisionTitle}` : ""}
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Diff Stats */}
        <div className="flex items-center gap-3">
          {/* Summary Badges */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              +{addedCount} baris
            </span>
            <span className="rounded-md bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              -{removedCount} baris
            </span>
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-400">
              {unchangedCount} sama
            </span>
          </div>

          {/* Toggle Switch */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                viewMode === "side-by-side"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Berdampingan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("unified")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                viewMode === "unified"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tunggal Terpadu
            </button>
          </div>
        </div>
      </div>

      {/* Diff Table Body */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs">
        {viewMode === "side-by-side" ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                <th className="w-12 px-2 py-1.5 text-center font-normal">#</th>
                <th className="w-1/2 px-3 py-1.5 font-bold">Revisi #{diffResult.baseRevisionNo} (Asal)</th>
                <th className="w-12 px-2 py-1.5 text-center font-normal border-l border-slate-200 dark:border-slate-800">#</th>
                <th className="w-1/2 px-3 py-1.5 font-bold">Revisi #{diffResult.compareRevisionNo} (Tujuan)</th>
              </tr>
            </thead>
            <tbody>
              {sideBySideRows.map((row, rIdx) => {
                const leftType = row.left?.type;
                const rightType = row.right?.type;

                const leftBg =
                  leftType === "removed"
                    ? "bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                    : leftType === "empty"
                    ? "bg-slate-100/30 dark:bg-slate-900/50"
                    : "text-slate-800 dark:text-slate-200";

                const rightBg =
                  rightType === "added"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                    : rightType === "empty"
                    ? "bg-slate-100/30 dark:bg-slate-900/50"
                    : "text-slate-800 dark:text-slate-200";

                return (
                  <tr
                    key={rIdx}
                    className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    {/* Left Gutter */}
                    <td className="select-none px-2 py-1 text-center text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50">
                      {row.left?.lineNo ?? ""}
                    </td>
                    {/* Left Content */}
                    <td className={`px-3 py-1 whitespace-pre-wrap break-all ${leftBg}`}>
                      {row.left?.content ? (
                        <span>
                          {leftType === "removed" && (
                            <span className="font-bold mr-1 text-rose-600">-</span>
                          )}
                          {row.left.content}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 select-none">&nbsp;</span>
                      )}
                    </td>

                    {/* Right Gutter */}
                    <td className="select-none px-2 py-1 text-center text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800">
                      {row.right?.lineNo ?? ""}
                    </td>
                    {/* Right Content */}
                    <td className={`px-3 py-1 whitespace-pre-wrap break-all ${rightBg}`}>
                      {row.right?.content ? (
                        <span>
                          {rightType === "added" && (
                            <span className="font-bold mr-1 text-emerald-600">+</span>
                          )}
                          {row.right.content}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 select-none">&nbsp;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Unified Diff View */
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                <th className="w-12 px-2 py-1.5 text-center font-normal">L</th>
                <th className="w-12 px-2 py-1.5 text-center font-normal">R</th>
                <th className="px-3 py-1.5 font-bold">Baris Konten</th>
              </tr>
            </thead>
            <tbody>
              {diffResult.lines.map((line, idx) => {
                const isAdded = line.type === "added";
                const isRemoved = line.type === "removed";

                const lineBg = isAdded
                  ? "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                  : isRemoved
                  ? "bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                  : "text-slate-800 dark:text-slate-200";

                return (
                  <tr
                    key={idx}
                    className={`border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${lineBg}`}
                  >
                    <td className="select-none px-2 py-1 text-center text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50">
                      {line.leftLineNo ?? ""}
                    </td>
                    <td className="select-none px-2 py-1 text-center text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50">
                      {line.rightLineNo ?? ""}
                    </td>
                    <td className="px-3 py-1 whitespace-pre-wrap break-all">
                      <span className="font-bold mr-2 select-none">
                        {isAdded ? "+" : isRemoved ? "-" : " "}
                      </span>
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
