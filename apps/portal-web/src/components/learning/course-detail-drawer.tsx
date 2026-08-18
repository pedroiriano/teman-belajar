"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { CourseCompletion, GradeItem } from "@/lib/learning/types";

export function CourseDetailDrawer({ courseId, onClose }: { courseId: string | null, onClose: () => void }) {
  const [data, setData] = useState<{ grades: GradeItem[] | null; completion: CourseCompletion | null; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (courseId) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
      // Focus drawer for accessibility
      drawerRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [courseId, onClose]);

  const loadData = useCallback(() => {
    if (!courseId) return;
    
    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setData(null);
    
    Promise.allSettled([
      fetch(`/api/learning/me/courses/${courseId}/completion`, { signal }).then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.detail || "Gagal memuat status");
        return json.data as CourseCompletion;
      }),
      fetch(`/api/learning/me/courses/${courseId}/grades`, { signal }).then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.detail || "Gagal memuat nilai");
        return json.data as GradeItem[];
      })
    ])
    .then(([completionResult, gradesResult]) => {
      if (signal.aborted) return;

      const completionData = completionResult.status === "fulfilled" ? completionResult.value : null;
      const gradesData = gradesResult.status === "fulfilled" ? gradesResult.value : null;

      if (completionResult.status === "rejected" || gradesResult.status === "rejected") {
        setData({ 
          error: "Beberapa data tidak dapat dimuat, mungkin karena layanan Moodle sedang gangguan.", 
          completion: completionData, 
          grades: gradesData 
        });
      } else {
        setData({ completion: completionData, grades: gradesData });
      }
      setLoading(false);
    })
    .catch((err) => {
      if (!signal.aborted) {
        setData({ error: "Terjadi kesalahan jaringan", completion: null, grades: null });
        setLoading(false);
      }
    });

    return controller;
  }, [courseId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const controller = loadData();
    return () => { 
      if (controller) controller.abort(); 
    };
  }, [loadData]);

  if (!courseId) return null;

  const handleRetry = () => {
    loadData();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        aria-hidden="true" 
        onClick={onClose}
      />
      <div 
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-detail-title"
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform dark:bg-slate-900 sm:max-w-lg focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <h2 id="course-detail-title" className="text-lg font-black text-slate-800 dark:text-white">Detail Pembelajaran</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 focus:ring-2 focus:ring-teal-500"
            aria-label="Tutup detail"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600 mb-4" />
              <p className="text-sm font-semibold">Memuat detail aktivitas...</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {data?.error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Peringatan</h3>
                    <button 
                      onClick={handleRetry}
                      className="rounded bg-amber-200/50 px-2 py-1 text-xs font-bold hover:bg-amber-300/50 dark:bg-amber-800/30 dark:hover:bg-amber-700/50 transition-colors"
                    >
                      Coba Lagi
                    </button>
                  </div>
                  <p className="mt-1 text-sm">{data.error}</p>
                </div>
              )}

              {data?.completion && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status Penyelesaian</h3>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status Modul</span>
                    <span className={`text-xs font-bold ${data.completion.completed ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {data.completion.completed ? '✓ Selesai' : data.completion.status || 'Sedang Berjalan'}
                    </span>
                  </div>
                </section>
              )}

              {data?.grades && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penilaian</h3>
                  <div className="mt-4 grid gap-3">
                    {data.grades.filter(item => !item.hidden).map((item) => (
                      <div key={item.id} className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.item_name || "Penilaian"}</span>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Nilai: <span className="font-bold text-slate-700 dark:text-slate-300">{item.grade_formatted || item.grade || "-"}</span></span>
                          <span className="text-xs text-slate-400">Maks: {item.grade_max}</span>
                        </div>
                        {item.feedback && (
                          <div className="mt-3 rounded-md bg-white p-3 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <strong>Umpan Balik:</strong> {item.feedback}
                          </div>
                        )}
                      </div>
                    ))}
                    {data.grades.filter(item => !item.hidden).length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data nilai yang tersedia.</p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t border-slate-100 p-6 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-slate-400"
          >
            Tutup
          </button>
        </div>
      </div>
    </>
  );
}
