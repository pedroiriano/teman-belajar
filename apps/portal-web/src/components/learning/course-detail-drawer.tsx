"use client";

import { useEffect, useState } from "react";

export function CourseDetailDrawer({ courseId, onClose }: { courseId: string | null, onClose: () => void }) {
  const [data, setData] = useState<{ grades: any; completion: any; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) {
      return;
    }
    
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    
    Promise.all([
      fetch(`/api/learning/me/courses/${courseId}/completion`).then(r => r.json()),
      fetch(`/api/learning/me/courses/${courseId}/grades`).then(r => r.json())
    ])
    .then(([completion, grades]) => {
      if (isMounted) {
        if (completion.error || grades.error) {
          setData({ error: "Gagal memuat sebagian data. Silakan coba lagi.", completion: null, grades: null });
        } else {
          setData({ completion: completion.data, grades: grades.data });
        }
        setLoading(false);
      }
    })
    .catch(() => {
      if (isMounted) {
        setData({ error: "Terjadi kesalahan jaringan", completion: null, grades: null });
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [courseId]);

  if (!courseId) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        aria-hidden="true" 
        onClick={onClose}
      />
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-detail-title"
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform dark:bg-slate-900 sm:max-w-lg"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <h2 id="course-detail-title" className="text-lg font-black text-slate-800 dark:text-white">Detail Pembelajaran</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
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
          ) : data?.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              <h3 className="font-bold">Gagal memuat</h3>
              <p className="mt-1 text-sm">{data.error}</p>
              <button 
                onClick={() => {
                  setLoading(true);
                  setData(null);
                  Promise.all([
                    fetch(`/api/learning/me/courses/${courseId}/completion`).then(r => r.json()),
                    fetch(`/api/learning/me/courses/${courseId}/grades`).then(r => r.json())
                  ]).then(([c, g]) => { setData({ completion: c.data, grades: g.data }); setLoading(false); }).catch(() => { setData({ error: "Terjadi kesalahan", completion: null, grades: null }); setLoading(false); });
                }}
                className="mt-3 text-sm font-bold underline"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="grid gap-8">
              {data?.completion && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penyelesaian Modul</h3>
                  <div className="mt-4 grid gap-3">
                    {data.completion.statuses?.map((stat: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{stat.modname || "Aktivitas"}</span>
                        <span className={`text-xs font-bold ${stat.state === 1 ? 'text-green-600' : 'text-slate-400'}`}>
                          {stat.state === 1 ? '✓ Selesai' : 'Belum'}
                        </span>
                      </div>
                    ))}
                    {!data.completion.statuses?.length && (
                      <p className="text-sm text-slate-500">Tidak ada kriteria penyelesaian untuk aktivitas ini.</p>
                    )}
                  </div>
                </section>
              )}

              {data?.grades && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Penilaian</h3>
                  <div className="mt-4 grid gap-3">
                    {data.grades.gradeitems?.map((item: any, idx: number) => {
                      if (item.itemtype === "course") return null;
                      return (
                        <div key={idx} className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.itemname || "Penilaian"}</span>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Nilai: {item.graderaw !== null ? item.graderaw : "-"}</span>
                            {item.grademax && <span className="text-xs text-slate-400">Maks: {item.grademax}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {!data.grades.gradeitems?.length && (
                      <p className="text-sm text-slate-500">Belum ada data nilai tersedia.</p>
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
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </>
  );
}
