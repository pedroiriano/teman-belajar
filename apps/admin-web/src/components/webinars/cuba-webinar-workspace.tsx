"use client";

import { useState } from "react";
import type { AdminWebinarItem } from "@/types/webinar";

interface CubaWebinarWorkspaceProps {
  initialWebinars: AdminWebinarItem[];
}

export function CubaWebinarWorkspace({ initialWebinars }: CubaWebinarWorkspaceProps) {
  const [webinars] = useState<AdminWebinarItem[]>(initialWebinars);
  const [filter, setFilter] = useState<string>("all");
  const [selectedWebinar, setSelectedWebinar] = useState<AdminWebinarItem | null>(null);

  const filtered = webinars.filter((w) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

  const totalCapacity = webinars.reduce((sum, w) => sum + w.capacity, 0);
  const totalEnrolled = webinars.reduce((sum, w) => sum + w.enrolled_count, 0);
  const upcomingCount = webinars.filter((w) => w.status === "upcoming").length;

  return (
    <div className="space-y-6" data-cuba-component="webinar-workspace">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sesi Live</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{webinars.length}</p>
          <p className="mt-1 text-xs text-sky-600 dark:text-sky-400 font-medium">Tersinkronisasi Moodle mod_zoom</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sesi Mendatang</p>
          <p className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">{upcomingCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Dalam 30 hari ke depan</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pendaftar</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalEnrolled}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Dari {totalCapacity} kapasitas kursi</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kesiapan Provider</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Zoom S2S Standby</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">ADR-020 Authority</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {["all", "upcoming", "in_progress", "completed"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  filter === tab
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab === "all"
                  ? "Semua Sesi"
                  : tab === "upcoming"
                  ? "Akan Datang"
                  : tab === "in_progress"
                  ? "Sedang Berlangsung"
                  : "Selesai"}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> sesi
          </div>
        </div>
      </div>

      {/* Webinar Cards / Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Topik Webinar</th>
                <th className="px-6 py-3.5">Narasumber</th>
                <th className="px-6 py-3.5">Jadwal (WIB)</th>
                <th className="px-6 py-3.5">Peserta</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.speaker}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(item.starts_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.round((item.enrolled_count / item.capacity) * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.enrolled_count}/{item.capacity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        item.status === "upcoming"
                          ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                          : item.status === "in_progress"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      }`}
                    >
                      {item.status === "upcoming"
                        ? "Akan Datang"
                        : item.status === "in_progress"
                        ? "Live"
                        : "Selesai"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedWebinar(item)}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedWebinar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="admin-card max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Detail Sesi Webinar #{selectedWebinar.id}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedWebinar.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWebinar(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">{selectedWebinar.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-slate-500 dark:text-slate-400 font-semibold">Narasumber</p>
                <p className="text-slate-900 dark:text-white font-bold mt-1">{selectedWebinar.speaker}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-slate-500 dark:text-slate-400 font-semibold">Waktu Pelaksanaan</p>
                <p className="text-slate-900 dark:text-white font-bold mt-1">
                  {new Date(selectedWebinar.starts_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - {new Date(selectedWebinar.ends_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-slate-500 dark:text-slate-400 font-semibold">Kapasitas</p>
                <p className="text-slate-900 dark:text-white font-bold mt-1">
                  {selectedWebinar.enrolled_count} / {selectedWebinar.capacity} Kursi
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-slate-500 dark:text-slate-400 font-semibold">Provider Engine</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 uppercase">
                  {selectedWebinar.provider} (mod_zoom)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWebinar(null)}
                className="admin-button-secondary text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
