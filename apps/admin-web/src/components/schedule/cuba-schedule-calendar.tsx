"use client";

import { useId, useMemo, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import type { CreateScheduleInput, ScheduleEvent, ScheduleModule } from "@/types/schedule";
import { createScheduleEventAction, cancelScheduleEventAction } from "@/app/actions/schedule";

interface CubaScheduleCalendarProps {
  initialEvents: ScheduleEvent[];
  initialConflictCount: number;
}

const moduleBadgeVariant: Record<ScheduleModule, "primary" | "warning" | "success"> = {
  Pelatihan: "primary",
  Pengetahuan: "primary",
  Microlearning: "warning",
  Pengumuman: "warning",
  Berita: "success",
};

const statusBadgeClasses: Record<string, string> = {
  scheduled: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  needs_review: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  failed: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
};

export function CubaScheduleCalendar({
  initialEvents,
  initialConflictCount,
}: CubaScheduleCalendarProps) {
  const dialogId = useId();
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-01");
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(8); // 0-indexed: 8 = September
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [conflictDismissed, setConflictDismissed] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  // Form states for creating new schedule
  const [formTitle, setFormTitle] = useState("");
  const [formModule, setFormModule] = useState<ScheduleModule>("Pelatihan");
  const [formDate, setFormDate] = useState(selectedDate);
  const [formTime, setFormTime] = useState("09:00");
  const [formCohort, setFormCohort] = useState("");
  const [formParticipants, setFormParticipants] = useState<number | undefined>(undefined);
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const currentMonthString = useMemo(() => {
    const m = String(currentMonthIndex + 1).padStart(2, "0");
    return `${currentYear}-${m}`;
  }, [currentYear, currentMonthIndex]);

  // Filter events by module
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
      return true;
    });
  }, [events, moduleFilter]);

  // Conflict detection
  const conflicts = useMemo(() => {
    return filteredEvents.filter((e) => e.hasConflict);
  }, [filteredEvents]);

  // Compute 35 calendar cells (5 rows x 7 days) starting on Monday
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
    // Sunday is 0 in JS, make Monday 0 -> 0: Mon, 1: Tue, ..., 6: Sun
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonthIndex, 0).getDate();

    const cells: Array<{
      dateString: string;
      dayNumber: number;
      outside: boolean;
      events: ScheduleEvent[];
    }> = [];

    // Prev month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = currentMonthIndex === 0 ? 12 : currentMonthIndex;
      const prevY = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        outside: true,
        events: filteredEvents.filter((e) => e.targetDate === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        outside: false,
        events: filteredEvents.filter((e) => e.targetDate === dateStr),
      });
    }

    // Next month days to reach 35
    const remaining = 35 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonthIndex === 11 ? 1 : currentMonthIndex + 2;
      const nextY = currentMonthIndex === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateString: dateStr,
        dayNumber: d,
        outside: true,
        events: filteredEvents.filter((e) => e.targetDate === dateStr),
      });
    }

    return cells;
  }, [currentYear, currentMonthIndex, filteredEvents]);

  // Daily agenda for the selected date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.targetDate === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Formatted date label
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dateObj);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(2026);
    setCurrentMonthIndex(8); // September
    setSelectedDate("2026-09-01");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);

    const input: CreateScheduleInput = {
      title: formTitle,
      module: formModule,
      targetDate: formDate,
      targetTime: formTime,
      owner: "Editor Publikasi",
      cohortLabel: formCohort || undefined,
      participantsCount: formParticipants,
      description: formDesc || undefined,
    };

    const res = await createScheduleEventAction(input);
    setBusy(false);

    if (res.success) {
      setEvents((prev) => [res.data, ...prev]);
      setShowModal(false);
      setFormTitle("");
      setFormCohort("");
      setFormDesc("");
      showToast(`Jadwal "${res.data.title}" berhasil ditambahkan!`);
    } else {
      setFormError(res.error || "Gagal menyimpan jadwal");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 shadow-xl dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
            <AdminIcon name="check" className="h-4 w-4" />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Route Intro Header Cuba */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-black uppercase tracking-[.16em] text-sky-600 dark:text-sky-400">
            Kalender konten
          </span>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Rencanakan publikasi tanpa konflik
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Jadwal menggabungkan konten, kelas, dan window publikasi dalam timezone Asia/Jakarta (WIB).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="admin-button-secondary inline-flex items-center gap-2"
            onClick={handleToday}
          >
            <AdminIcon name="calendar" className="h-4 w-4" />
            Hari ini
          </button>
          <button
            type="button"
            className="admin-button inline-flex items-center gap-2"
            onClick={() => {
              setFormDate(selectedDate);
              setShowModal(true);
            }}
          >
            <AdminIcon name="plus" className="h-4 w-4" />
            Jadwalkan konten
          </button>
        </div>
      </section>

      {/* Conflict Warning Banner */}
      {!conflictDismissed && conflicts.length > 0 && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/90 p-4 text-yellow-950 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-200 sm:flex-row sm:items-center shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellow-500 text-slate-950 font-bold shadow-sm">
              <AdminIcon name="alert" className="h-5 w-5" />
            </span>
            <div>
              <strong className="block text-sm font-extrabold">Konflik jadwal terdeteksi</strong>
              <p className="text-xs text-yellow-900 dark:text-yellow-300">
                Terdapat {conflicts.length} entri jadwal dengan bentrok slot jam dan tanggal yang sama (Selasa, 09.00 WIB).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-yellow-300 bg-white px-3 py-1.5 text-xs font-bold text-yellow-900 transition hover:bg-yellow-100 dark:border-yellow-800 dark:bg-slate-900 dark:text-yellow-200 dark:hover:bg-slate-800"
              onClick={() => {
                setSelectedDate("2026-09-01");
                showToast("Slot konflik ditampilkan di agenda harian.");
              }}
            >
              Tinjau slot
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-yellow-700 hover:bg-yellow-200/50 dark:text-yellow-400"
              aria-label="Tutup pemberitahuan konflik"
              onClick={() => setConflictDismissed(true)}
            >
              <AdminIcon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Schedule Layout: Calendar Grid + Side Stack */}
      <section className="schedule-layout">
        {/* Month Calendar Card */}
        <article className="cuba-card month-calendar shadow-sm">
          {/* Calendar Header with navigation */}
          <header className="calendar-head">
            <div>
              <span className="text-xs font-bold text-slate-400">
                Tahun {currentYear}
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                {monthNames[currentMonthIndex]} {currentYear}
              </h2>
            </div>
            <div className="calendar-nav">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                aria-label="Bulan sebelumnya"
                onClick={handlePrevMonth}
              >
                ‹
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                onClick={handleToday}
              >
                Bulan Aktif
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                aria-label="Bulan berikutnya"
                onClick={handleNextMonth}
              >
                ›
              </button>
            </div>
          </header>

          {/* Calendar Grid 7x5 */}
          <div className="calendar-grid">
            <span className="weekday">Sen</span>
            <span className="weekday">Sel</span>
            <span className="weekday">Rab</span>
            <span className="weekday">Kam</span>
            <span className="weekday">Jum</span>
            <span className="weekday">Sab</span>
            <span className="weekday">Min</span>

            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateString === selectedDate;
              return (
                <button
                  key={`${cell.dateString}-${idx}`}
                  type="button"
                  tabIndex={cell.outside ? -1 : 0}
                  onClick={() => setSelectedDate(cell.dateString)}
                  className={`calendar-day ${cell.outside ? "outside" : ""} ${
                    isSelected ? "selected" : ""
                  }`}
                  aria-label={`${cell.dayNumber} ${monthNames[currentMonthIndex]}${
                    cell.events.length ? `, ${cell.events.length} agenda` : ""
                  }`}
                >
                  <span className="day-number">{cell.dayNumber}</span>
                  {cell.events.slice(0, 2).map((ev) => {
                    const variant = moduleBadgeVariant[ev.module] || "primary";
                    return (
                      <span
                        key={ev.id}
                        className={`calendar-event ${variant}`}
                        title={`${ev.targetTime} WIB - ${ev.title}`}
                      >
                        {ev.title}
                      </span>
                    );
                  })}
                  {cell.events.length > 2 && (
                    <span className="mt-1 block text-[8px] font-extrabold text-sky-700 dark:text-sky-300">
                      +{cell.events.length - 2} lagi
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </article>

        {/* Side Stack: Daily Agenda + Module Filter */}
        <aside className="space-y-6">
          {/* Daily Agenda Card */}
          <article className="cuba-card p-5 shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Agenda tanggal
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white capitalize">
                  {formattedSelectedDate}
                </h2>
              </div>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                {selectedDateEvents.length} agenda
              </span>
            </header>

            {selectedDateEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <AdminIcon name="calendar" className="h-5 w-5" />
                </span>
                Belum ada publikasi pada tanggal ini.
              </div>
            ) : (
              <ol className="agenda-compact divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDateEvents.map((item) => {
                  const badgeClass =
                    statusBadgeClasses[item.status] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <li key={item.id} className="py-3">
                      <time className="font-extrabold text-xs text-sky-700 dark:text-sky-400">
                        {item.targetTime}
                      </time>
                      <div className="min-w-0 pr-2">
                        <strong className="block truncate text-xs font-black text-slate-900 dark:text-white">
                          {item.title}
                        </strong>
                        <small className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {item.module} · {item.owner}
                          {item.cohortLabel ? ` · ${item.cohortLabel}` : ""}
                        </small>
                        {item.hasConflict && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-yellow-700 dark:text-yellow-400">
                            <AdminIcon name="alert" className="h-3 w-3" /> Konflik slot waktu
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}
                        >
                          {item.statusLabel}
                        </span>
                        {item.status === "scheduled" && (
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Batalkan jadwal"
                            aria-label={`Batalkan jadwal ${item.title}`}
                            disabled={busy}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Batalkan jadwal publikasi untuk "${item.title}"?`)) return;
                              setBusy(true);
                              const res = await cancelScheduleEventAction(item.id);
                              setBusy(false);
                              if (res.success) {
                                setEvents((prev) =>
                                  prev.map((ev) =>
                                    ev.id === item.id
                                      ? { ...ev, status: "cancelled", statusLabel: "Dibatalkan" }
                                      : ev
                                  )
                                );
                                showToast(`Jadwal "${item.title}" berhasil dibatalkan.`);
                              } else {
                                showToast(res.error || "Gagal membatalkan jadwal.");
                              }
                            }}
                          >
                            <AdminIcon name="x" className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </article>

          {/* Module Filter Card */}
          <article className="cuba-card p-5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Filter kalender
            </span>
            <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">
              Tampilkan agenda
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="filter-module" className="admin-label">
                  Modul konten
                </label>
                <select
                  id="filter-module"
                  className="admin-input"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  <option value="all">Semua modul</option>
                  <option value="Pelatihan">Program Pelatihan</option>
                  <option value="Microlearning">Microlearning</option>
                  <option value="Pengetahuan">Pusat Pengetahuan</option>
                  <option value="Pengumuman">Pengumuman</option>
                  <option value="Berita">Berita</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-date" className="admin-label">
                  Pilih tanggal
                </label>
                <input
                  id="filter-date"
                  type="date"
                  className="admin-input"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      const [y, m] = e.target.value.split("-").map(Number);
                      setCurrentYear(y);
                      setCurrentMonthIndex(m - 1);
                    }
                  }}
                />
              </div>
            </div>
          </article>
        </aside>
      </section>

      {/* Modal Dialog: Jadwalkan Konten Baru */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${dialogId}-title`}
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="cuba-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-sky-600 dark:text-sky-400">Manajemen Rilis</p>
                <h2 id={`${dialogId}-title`} className="text-lg font-black text-slate-900 dark:text-white">
                  Jadwalkan Publikasi Konten
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setShowModal(false)}
              >
                <AdminIcon name="x" className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="mt-4 admin-alert-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="sched-title" className="admin-label">
                  Judul materi / cohort *
                </label>
                <input
                  id="sched-title"
                  required
                  maxLength={160}
                  className="admin-input"
                  placeholder="Contoh: Orientasi ASN 2026 Batch 1"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sched-module" className="admin-label">
                    Modul
                  </label>
                  <select
                    id="sched-module"
                    className="admin-input"
                    value={formModule}
                    onChange={(e) => setFormModule(e.target.value as ScheduleModule)}
                  >
                    <option value="Pelatihan">Pelatihan</option>
                    <option value="Microlearning">Microlearning</option>
                    <option value="Pengetahuan">Pusat Pengetahuan</option>
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Berita">Berita</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sched-cohort" className="admin-label">
                    Label Cohort (opsional)
                  </label>
                  <input
                    id="sched-cohort"
                    className="admin-input"
                    placeholder="Batch 1 - Gelombang A"
                    value={formCohort}
                    onChange={(e) => setFormCohort(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sched-date" className="admin-label">
                    Tanggal Publikasi *
                  </label>
                  <input
                    id="sched-date"
                    required
                    type="date"
                    className="admin-input"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="sched-time" className="admin-label">
                    Waktu (WIB) *
                  </label>
                  <input
                    id="sched-time"
                    required
                    type="time"
                    className="admin-input"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sched-desc" className="admin-label">
                  Keterangan (opsional)
                </label>
                <textarea
                  id="sched-desc"
                  rows={2}
                  className="admin-input"
                  placeholder="Catatan window publikasi dan penanggung jawab"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="admin-button-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="admin-button"
                >
                  {busy ? "Menyimpan…" : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
