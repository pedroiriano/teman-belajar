"use client";

import React, { useEffect, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import {
  getContentRevisionsAction,
  getRevisionDiffAction,
  rollbackRevisionAction,
} from "@/app/actions/content-versioning";
import type {
  ContentRevision,
  DiffResult,
  VersioningModule,
} from "@/types/content-versioning";
import { CubaDiffViewer } from "./cuba-diff-viewer";
import { CubaRevisionTimeline } from "./cuba-revision-timeline";

interface CubaContentVersioningPanelProps {
  module: VersioningModule;
  articleId: string;
  onRollbackComplete?: () => void;
}

export function CubaContentVersioningPanel({
  module,
  articleId,
  onRollbackComplete,
}: CubaContentVersioningPanelProps) {
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [baseRevNo, setBaseRevNo] = useState<number>(1);
  const [compareRevNo, setCompareRevNo] = useState<number>(1);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Rollback confirmation dialog state
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Load initial revisions
  const loadRevisions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getContentRevisionsAction(module, articleId);
      if (!res.success || !res.data) {
        setError(res.error || "Gagal memuat riwayat revisi");
        return;
      }

      setRevisions(res.data);

      if (res.data.length >= 2) {
        const latest = res.data[0].revisionNo;
        const prev = res.data[1].revisionNo;
        setBaseRevNo(prev);
        setCompareRevNo(latest);
      } else if (res.data.length === 1) {
        setBaseRevNo(res.data[0].revisionNo);
        setCompareRevNo(res.data[0].revisionNo);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data versi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    getContentRevisionsAction(module, articleId)
      .then((res) => {
        if (ignore) return;
        if (!res.success || !res.data) {
          setError(res.error || "Gagal memuat riwayat revisi");
        } else {
          setRevisions(res.data);
          if (res.data.length >= 2) {
            setBaseRevNo(res.data[1].revisionNo);
            setCompareRevNo(res.data[0].revisionNo);
          } else if (res.data.length === 1) {
            setBaseRevNo(res.data[0].revisionNo);
            setCompareRevNo(res.data[0].revisionNo);
          }
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err.message || "Gagal memuat data versi.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [module, articleId]);

  // Load diff whenever selected revisions change
  useEffect(() => {
    if (revisions.length === 0) return;
    let ignore = false;

    getRevisionDiffAction(module, articleId, baseRevNo, compareRevNo)
      .then((res) => {
        if (ignore) return;
        if (res.success && res.data) {
          setDiffResult(res.data);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Gagal menghitung diff:", err);
        }
      })
      .finally(() => {
        if (!ignore) {
          setDiffLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [module, articleId, baseRevNo, compareRevNo, revisions.length]);

  const handleRollbackConfirm = async () => {
    if (rollbackTarget === null) return;
    setRollbackLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await rollbackRevisionAction(module, articleId, rollbackTarget);
      if (!res.success) {
        setError(res.error || "Gagal memulihkan versi.");
      } else {
        setSuccessMessage(res.message || "Versi berhasil dipulihkan.");
        setRollbackTarget(null);
        await loadRevisions();
        if (onRollbackComplete) {
          onRollbackComplete();
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memulihkan versi.");
    } finally {
      setRollbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mb-2" />
        <p className="text-xs font-semibold">Memuat riwayat revisi dan linimasa perubahan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banners */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AdminIcon name="alert" className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <AdminIcon name="check" className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Left Column Timeline (40%), Right Column Diff Viewer (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AdminIcon name="clock" className="h-4 w-4 text-sky-600" />
              <span>Linimasa Revisi ({revisions.length})</span>
            </h3>
            <button
              type="button"
              onClick={loadRevisions}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Perbarui riwayat revisi"
            >
              <AdminIcon name="refresh" className="h-3.5 w-3.5" />
            </button>
          </div>

          <CubaRevisionTimeline
            revisions={revisions}
            selectedBaseRev={baseRevNo}
            selectedCompareRev={compareRevNo}
            onSelectBaseRev={setBaseRevNo}
            onSelectCompareRev={setCompareRevNo}
            onRollback={(revNo) => setRollbackTarget(revNo)}
            isRollbackLoading={rollbackLoading}
          />
        </div>

        {/* Diff Viewer Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AdminIcon name="file" className="h-4 w-4 text-sky-600" />
              <span>Inspeksi Perubahan (Diff)</span>
            </h3>
            {diffLoading && (
              <span className="text-xs text-slate-400 animate-pulse font-medium">
                Menghitung perbedaan...
              </span>
            )}
          </div>

          {diffResult ? (
            <CubaDiffViewer
              diffResult={diffResult}
              baseRevisionTitle={`Revisi #${baseRevNo}`}
              compareRevisionTitle={`Revisi #${compareRevNo}`}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-400">
              Pilih dua versi pada linimasa untuk melihat perbandingan perubahannya.
            </div>
          )}
        </div>
      </div>

      {/* Rollback Confirmation Modal */}
      {rollbackTarget !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm font-bold">
                <AdminIcon name="refresh" className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Konfirmasi Pemulihan Versi
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Revisi target: #{rollbackTarget}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tindakan ini akan membuat revisi draf baru dengan isi yang sama persis seperti
              pada <strong>Revisi #{rollbackTarget}</strong>. Konten revisi yang ada saat ini
              tetap tersimpan dalam riwayat dan tidak akan terhapus.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={rollbackLoading}
                onClick={() => setRollbackTarget(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rollbackLoading}
                onClick={handleRollbackConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {rollbackLoading ? "Memulihkan..." : "Ya, Pulihkan ke Versi Ini"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
