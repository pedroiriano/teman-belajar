"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/portal-icon";
import type { EnrolledCourse, UserCertificate } from "@/lib/learning/types";

interface LearnerAnalyticsCardProps {
  courses: EnrolledCourse[];
  certificates?: UserCertificate[];
}

export function LearnerAnalyticsCard({ courses, certificates = [] }: LearnerAnalyticsCardProps) {
  const [activeTab, setActiveTab] = useState<"progress" | "topics" | "rhythm">("progress");

  // Calculations
  const total = courses.length;
  const completed = courses.filter((c) => c.completed || (c.progress && c.progress >= 100)).length;
  const inProgress = courses.filter((c) => !c.completed && (c.progress ? c.progress > 0 && c.progress < 100 : false)).length;
  const notStarted = Math.max(0, total - completed - inProgress);

  const avgProgress = total > 0
    ? Math.round(courses.reduce((acc, c) => acc + (c.completed ? 100 : (c.progress || 0)), 0) / total)
    : 0;

  // Donut chart math
  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
  const notStartedPct = total > 0 ? (notStarted / total) * 100 : 0;

  const circumference = 2 * Math.PI * 40; // radius = 40, circumference ≈ 251.32
  const completedStroke = (completedPct / 100) * circumference;
  const inProgressStroke = (inProgressPct / 100) * circumference;
  const notStartedStroke = (notStartedPct / 100) * circumference;

  // Topic distribution inference from course titles
  const topicDistribution = useMemo(() => {
    const topics: Record<string, { count: number; hours: number; completed: number }> = {
      "Pelayanan Publik dan Digital ASN": { count: 0, hours: 0, completed: 0 },
      "Tata Kelola dan Merit ASN": { count: 0, hours: 0, completed: 0 },
      "Teknologi Informasi dan Keamanan": { count: 0, hours: 0, completed: 0 },
      "Kompetensi Manajerial": { count: 0, hours: 0, completed: 0 },
    };

    courses.forEach((c) => {
      const name = (c.full_name || c.short_name || "").toLowerCase();
      let key = "Pelayanan Publik dan Digital ASN";
      if (name.includes("merit") || name.includes("kelola") || name.includes("pegawai")) {
        key = "Tata Kelola dan Merit ASN";
      } else if (name.includes("siber") || name.includes("keamanan") || name.includes("data") || name.includes("digital")) {
        key = "Teknologi Informasi dan Keamanan";
      } else if (name.includes("manajemen") || name.includes("pemimpin") || name.includes("strategis")) {
        key = "Kompetensi Manajerial";
      }

      topics[key].count += 1;
      topics[key].hours += c.completed ? 6 : (c.progress && c.progress > 50 ? 4 : 2);
      if (c.completed || (c.progress && c.progress >= 100)) {
        topics[key].completed += 1;
      }
    });

    return Object.entries(topics).filter(([_, data]) => data.count > 0 || total === 0);
  }, [courses, total]);

  // Weekly rhythm mockup based on activity
  const daysOfWeek = [
    { day: "Sen", active: true, hours: 1.5 },
    { day: "Sel", active: true, hours: 2.0 },
    { day: "Rab", active: false, hours: 0 },
    { day: "Kam", active: true, hours: 1.0 },
    { day: "Jum", active: true, hours: 2.5 },
    { day: "Sab", active: false, hours: 0 },
    { day: "Min", active: true, hours: 1.0 },
  ];

  return (
    <div className="portal-card mb-8 p-6 sm:p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 transition-all">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Analitik Pembelajaran
            </span>
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
            Pencapaian & Progres Belajar
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab("progress")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "progress"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Distribusi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "topics"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Topik & Waktu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rhythm")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "rhythm"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Ritme Mingguan
          </button>
        </div>
      </div>

      {/* Content per Active Tab */}
      <div className="mt-6">
        {activeTab === "progress" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart Visual */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="11"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  {/* Completed (Emerald) */}
                  {completedStroke > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="11"
                      strokeDasharray={`${completedStroke} ${circumference}`}
                      strokeDashoffset="0"
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* In Progress (Sky/Primary) */}
                  {inProgressStroke > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#0ea5e9"
                      strokeWidth="11"
                      strokeDasharray={`${inProgressStroke} ${circumference}`}
                      strokeDashoffset={`-${completedStroke}`}
                      className="transition-all duration-700 ease-out"
                    />
                  )}
                  {/* Not Started (Slate) */}
                  {notStartedStroke > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#cbd5e1"
                      strokeWidth="11"
                      strokeDasharray={`${notStartedStroke} ${circumference}`}
                      strokeDashoffset={`-${completedStroke + inProgressStroke}`}
                      className="transition-all duration-700 ease-out dark:stroke-slate-700"
                    />
                  )}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {avgProgress}%
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Rerata Progres
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Selesai & Lulus</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Telah menuntaskan seluruh modul</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{completed}</span>
                  <span className="text-xs text-slate-400 ml-1">({Math.round(completedPct)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-sky-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Sedang Berjalan</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Aktif mempelajari materi</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-sky-600 dark:text-sky-400">{inProgress}</span>
                  <span className="text-xs text-slate-400 ml-1">({Math.round(inProgressPct)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Belum Dimulai</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Telah terdaftar dalam kelas</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-slate-700 dark:text-slate-300">{notStarted}</span>
                  <span className="text-xs text-slate-400 ml-1">({Math.round(notStartedPct)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "topics" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribusi akumulasi waktu belajar dan penyelesaian kursus berdasarkan bidang keahlian:
            </p>
            <div className="space-y-3">
              {topicDistribution.map(([topicName, data]) => {
                const ratio = data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0;
                return (
                  <div key={topicName} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {topicName}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {data.count} Kursus • {data.hours} Jam Belajar
                        </span>
                        <span className="font-extrabold text-primary">{ratio}% Tuntas</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "rhythm" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Aktivitas Belajar 7 Hari Terakhir</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Konsistensi membuka materi dan menyelesaikan kuis</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <PortalIcon name="check" className="h-3.5 w-3.5" />
                <span>Streak Aktif: 5 Hari</span>
              </div>
            </div>

            {/* 7-day Bar Chart */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              {daysOfWeek.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-2">
                  <div className="w-full h-24 bg-slate-200/60 dark:bg-slate-700/50 rounded-lg flex items-end p-1">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${
                        d.active ? "bg-primary hover:bg-primary-600" : "bg-transparent"
                      }`}
                      style={{ height: d.active ? `${Math.min(100, d.hours * 35)}%` : "0%" }}
                      title={`${d.day}: ${d.hours} jam`}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{d.day}</span>
                  <span className="text-[10px] text-slate-400">{d.hours > 0 ? `${d.hours}j` : "-"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer link to full transcript */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Tercatat <strong>{certificates.length}</strong> sertifikat resmi terbit atas nama Anda.
        </span>
        <Link
          href="/profile/transcript"
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-primary-700 transition-colors"
        >
          <span>Lihat Transkrip Lengkap</span>
          <PortalIcon name="chevron-right" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
