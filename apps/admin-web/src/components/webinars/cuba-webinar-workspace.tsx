"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
import type {
  AdminWebinarItem,
  AdminWebinarDetailItem,
  CreateAdminWebinarInput,
} from "@/types/webinar";
import {
  createAdminWebinarAction,
  getAdminWebinarDetailAction,
} from "@/app/actions/webinars";
import { AdminDataTable } from "@/components/admin-data-table";

interface CubaWebinarWorkspaceProps {
  initialWebinars: AdminWebinarItem[];
}

export function CubaWebinarWorkspace({ initialWebinars }: CubaWebinarWorkspaceProps) {
  const [webinars, setWebinars] = useState<AdminWebinarItem[]>(initialWebinars);
  const [filter, setFilter] = useState<string>("all");
  const [speakerFilter, setSpeakerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWebinar, setSelectedWebinar] = useState<AdminWebinarDetailItem | AdminWebinarItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "attendance">("info");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    speaker: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    join_url: string;
  }>({
    title: "",
    description: "",
    speaker: "",
    starts_at: "",
    ends_at: "",
    capacity: 100,
    join_url: "",
  });

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!isCreateModalOpen && !selectedWebinar) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCreateModalOpen && !isSubmitting) {
          e.preventDefault();
          setIsCreateModalOpen(false);
        } else if (selectedWebinar) {
          e.preventDefault();
          setSelectedWebinar(null);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isCreateModalOpen, selectedWebinar, isSubmitting]);

  const speakerOptions = useMemo(() => {
    const list = Array.from(new Set(webinars.map((w) => w.speaker).filter(Boolean)));
    return list.sort((a, b) => a.localeCompare(b, "id"));
  }, [webinars]);

  const filteredWebinars = useMemo(() => {
    return webinars.filter((w) => {
      const matchesFilter = filter === "all" || w.status === filter;
      const matchesSpeaker = speakerFilter === "all" || w.speaker === speakerFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.speaker.toLowerCase().includes(q) ||
        (w.description || "").toLowerCase().includes(q);
      return matchesFilter && matchesSpeaker && matchesSearch;
    });
  }, [webinars, filter, speakerFilter, searchQuery]);

  const filteredAndPaged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWebinars.slice(start, start + pageSize);
  }, [filteredWebinars, page, pageSize]);

  const allCurrentKeys = filteredAndPaged.map((w) => String(w.id));
  const isAllSelected =
    allCurrentKeys.length > 0 && allCurrentKeys.every((id) => selectedIds.has(id));
  const isSomeSelected =
    allCurrentKeys.some((id) => selectedIds.has(id)) && !isAllSelected;

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        allCurrentKeys.forEach((id) => next.add(id));
      } else {
        allCurrentKeys.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenDetail = async (item: AdminWebinarItem) => {
    setSelectedWebinar(item);
    setDetailTab("info");
    setIsLoadingDetail(true);
    try {
      const res = await getAdminWebinarDetailAction(item.id);
      if (res.success && res.data) {
        setSelectedWebinar(res.data);
      }
    } catch {
      // Keep baseline
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const input: CreateAdminWebinarInput = {
        title: createForm.title,
        description: createForm.description,
        speaker: createForm.speaker,
        starts_at: new Date(createForm.starts_at).toISOString(),
        ends_at: new Date(createForm.ends_at).toISOString(),
        capacity: Number(createForm.capacity),
        join_url: createForm.join_url,
      };
      const res = await createAdminWebinarAction(input);
      if (!res.success || !res.data) {
        setCreateError(res.error || "Gagal menjadwalkan sesi webinar");
        return;
      }
      setWebinars((prev) => [res.data!, ...prev]);
      setIsCreateModalOpen(false);
      setCreateForm({
        title: "",
        description: "",
        speaker: "",
        starts_at: "",
        ends_at: "",
        capacity: 100,
        join_url: "",
      });
    } catch (err: any) {
      setCreateError(err.message || "Terjadi kesalahan sistem saat menjadwalkan");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Otoritas Moodle</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="webinar-speaker-filter" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Narasumber:
            </label>
            <select
              id="webinar-speaker-filter"
              value={speakerFilter}
              onChange={(e) => {
                setSpeakerFilter(e.target.value);
                setPage(1);
              }}
              className="cuba-input h-9 rounded-lg border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">Semua Narasumber</option>
              {speakerOptions.map((spk) => (
                <option key={spk} value={spk}>
                  {spk}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="admin-button-primary text-xs flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Jadwalkan Webinar Baru</span>
        </button>
      </div>

      {/* Webinar DataTable */}
      <AdminDataTable
        title="Daftar Sesi Webinar"
        description="Kelola jadwal, kapasitas peserta, dan status siaran webinar platform."
        itemCount={filteredAndPaged.length}
        headers={[
          { label: "Topik Webinar", key: "title" },
          { label: "Narasumber", key: "speaker" },
          { label: "Jadwal (WIB)", key: "starts_at" },
          { label: "Peserta", key: "capacity" },
          { label: "Status", key: "status" },
          { label: "Aksi", key: "actions", align: "right" },
        ]}
        emptyState="Belum ada sesi webinar pada filter ini."
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        searchPlaceholder="Cari topik atau narasumber…"
        statusFilter={filter}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "upcoming", label: "Akan Datang" },
          { value: "in_progress", label: "Sedang Berlangsung" },
          { value: "completed", label: "Selesai" },
        ]}
        onStatusFilterChange={(s) => {
          setFilter(s);
          setPage(1);
        }}
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        page={page}
        pageSize={pageSize}
        total={filteredWebinars.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={[10, 25, 50]}
      >
        {filteredAndPaged.map((item) => {
          const isChecked = selectedIds.has(String(item.id));
          return (
            <tr
              key={item.id}
              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(String(item.id))}
                  aria-label={`Pilih webinar ${item.title}`}
                />
              </td>
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
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((item.enrolled_count / item.capacity) * 100)
                        )}%`,
                      }}
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
                  onClick={() => handleOpenDetail(item)}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
                >
                  Detail
                </button>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      {/* Create Webinar Modal */}
      {isCreateModalOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (!isSubmitting && e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="admin-card max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="admin-kicker">Jadwal Sesi Baru</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Jadwalkan Webinar Pembelajaran</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWebinar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Sesi Webinar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Contoh: Lokakarya Keamanan Cloud Enterprise 2026"
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Narasumber / Instruktur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.speaker}
                  onChange={(e) => setCreateForm({ ...createForm, speaker: e.target.value })}
                  placeholder="Contoh: Ir. Hendra Gunawan, M.T."
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi & Silabus Ringkas
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Jelaskan ringkasan materi dan target audiens sesi webinar ini…"
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Mulai (WIB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.starts_at}
                    onChange={(e) => setCreateForm({ ...createForm, starts_at: e.target.value })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Selesai (WIB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.ends_at}
                    onChange={(e) => setCreateForm({ ...createForm, ends_at: e.target.value })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kapasitas Kursi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={createForm.capacity}
                    onChange={(e) => setCreateForm({ ...createForm, capacity: Number(e.target.value) })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Meeting / Siaran (Opsional)
                  </label>
                  <input
                    type="url"
                    value={createForm.join_url}
                    onChange={(e) => setCreateForm({ ...createForm, join_url: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                Sesi webinar yang dijadwalkan akan otomatis sinkron dengan adapter Moodle <code>mod_zoom</code> dan tetap fail-closed pada portal pembelajar sampai gerbang kredensial eksternal dibuka.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="admin-button-secondary text-xs"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="admin-button-primary text-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan…" : "Jadwalkan Webinar"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Enhanced Detail Modal */}
      {selectedWebinar && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedWebinar(null);
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedWebinar(null);
          }}
        >
          <div
            className="admin-card max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                  Detail Sesi Webinar #{selectedWebinar.id}
                </span>
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

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailTab("info")}
                className={`py-2 px-4 border-b-2 transition-colors ${
                  detailTab === "info"
                    ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Ringkasan Sesi
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("attendance")}
                className={`py-2 px-4 border-b-2 transition-colors ${
                  detailTab === "attendance"
                    ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Kehadiran & Presensi Peserta
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-8 text-center text-xs text-slate-500">Memuat rincian sesi…</div>
            ) : detailTab === "info" ? (
              <div className="space-y-4">
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
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">Kapasitas Kursi</p>
                    <p className="text-slate-900 dark:text-white font-bold mt-1">
                      {selectedWebinar.enrolled_count} / {selectedWebinar.capacity} Kursi Terisi
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">Provider Engine</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 uppercase">
                      {selectedWebinar.provider} (mod_zoom)
                    </p>
                  </div>
                </div>

                {selectedWebinar.join_url && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">Tautan Masuk Sesi (Host/Peserta):</p>
                    <a
                      href={selectedWebinar.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block font-mono text-sky-600 underline dark:text-sky-400 truncate"
                    >
                      {selectedWebinar.join_url}
                    </a>
                  </div>
                )}

                {selectedWebinar.recording_url && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Tautan Rekaman Sesi Tersedia:</p>
                    <a
                      href={selectedWebinar.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block font-mono text-emerald-700 underline dark:text-emerald-400 truncate"
                    >
                      {selectedWebinar.recording_url}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">Status Sinkronisasi Presensi</p>
                    <p className="text-slate-900 dark:text-white font-bold mt-1 uppercase">
                      {(selectedWebinar as AdminWebinarDetailItem).attendance_state === "synced" ? "Tersinkron (Synced)" : "Menunggu Sesi (Pending)"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">Total Durasi Presensi Tercatat</p>
                    <p className="text-slate-900 dark:text-white font-bold mt-1">
                      {Math.round(((selectedWebinar as AdminWebinarDetailItem).attendance_seconds || 0) / 60)} Menit
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Daftar Peserta Terdaftar ({selectedWebinar.enrolled_count} orang):
                  </p>
                  {((selectedWebinar as AdminWebinarDetailItem).attendees || []).length > 0 ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Nama Peserta</th>
                            <th className="px-3 py-2 font-semibold">Status Presensi</th>
                            <th className="px-3 py-2 font-semibold text-right">Waktu Hadir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {((selectedWebinar as AdminWebinarDetailItem).attendees || []).map((att, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                {att.name}
                                <span className="block text-[11px] text-slate-500">{att.email}</span>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    att.attendance_state === "present"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : att.attendance_state === "absent"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                      : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                                  }`}
                                >
                                  {att.attendance_state === "present"
                                    ? "Hadir"
                                    : att.attendance_state === "absent"
                                    ? "Tidak Hadir"
                                    : "Terdaftar"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-mono">
                                {att.attended_minutes ? `${att.attended_minutes} mnt` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Belum ada rincian presensi untuk sesi ini.</p>
                  )}
                </div>
              </div>
            )}

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
        </div>,
        document.body
      )}
    </div>
  );
}
