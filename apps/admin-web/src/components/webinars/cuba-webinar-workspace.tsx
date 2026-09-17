"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
import type {
  AdminWebinarItem,
  AdminWebinarDetailItem,
  CreateAdminWebinarInput,
  UpdateAdminWebinarInput,
} from "@/types/webinar";
import {
  createAdminWebinarAction,
  getAdminWebinarDetailAction,
  updateAdminWebinarAction,
  deleteAdminWebinarAction,
  updateAttendanceAction,
} from "@/app/actions/webinars";
import { AdminDataTable } from "@/components/admin-data-table";

interface CubaWebinarWorkspaceProps {
  initialWebinars: AdminWebinarItem[];
}

const isSessionExpired = (msg: string) =>
  /sesi|token|unauthorized|401|403|login|kedaluwarsa|konflik/i.test(msg);

export function CubaWebinarWorkspace({ initialWebinars }: CubaWebinarWorkspaceProps) {
  const [webinars, setWebinars] = useState<AdminWebinarItem[]>(initialWebinars);
  const [filter, setFilter] = useState<string>("all");
  const [speakerFilter, setSpeakerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWebinar, setSelectedWebinar] = useState<AdminWebinarDetailItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "attendance" | "edit">("info");
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
    provider: string;
  }>({
    title: "",
    description: "",
    speaker: "",
    starts_at: "",
    ends_at: "",
    capacity: 100,
    join_url: "",
    provider: "zoom",
  });

  // Edit State
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    speaker: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    status: AdminWebinarItem["status"];
    join_url: string;
    recording_url: string;
    provider: string;
  }>({
    title: "",
    description: "",
    speaker: "",
    starts_at: "",
    ends_at: "",
    capacity: 100,
    status: "upcoming",
    join_url: "",
    recording_url: "",
    provider: "zoom",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!isCreateModalOpen && !selectedWebinar && !deleteConfirmId) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmId && !isDeleting) {
          e.preventDefault();
          setDeleteConfirmId(null);
        } else if (isCreateModalOpen && !isSubmitting) {
          e.preventDefault();
          setIsCreateModalOpen(false);
        } else if (selectedWebinar && !isUpdating) {
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
  }, [isCreateModalOpen, selectedWebinar, deleteConfirmId, isSubmitting, isUpdating, isDeleting]);

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
    const startIndex = (page - 1) * pageSize;
    return filteredWebinars.slice(startIndex, startIndex + pageSize);
  }, [filteredWebinars, page, pageSize]);

  const isAllSelected = useMemo(() => {
    if (filteredAndPaged.length === 0) return false;
    return filteredAndPaged.every((w) => selectedIds.has(String(w.id)));
  }, [filteredAndPaged, selectedIds]);

  const isSomeSelected = useMemo(() => {
    if (filteredAndPaged.length === 0) return false;
    const count = filteredAndPaged.filter((w) => selectedIds.has(String(w.id))).length;
    return count > 0 && count < filteredAndPaged.length;
  }, [filteredAndPaged, selectedIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      filteredAndPaged.forEach((w) => next.delete(String(w.id)));
    } else {
      filteredAndPaged.forEach((w) => next.add(String(w.id)));
    }
    setSelectedIds(next);
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

  const handleOpenDetail = async (item: AdminWebinarItem) => {
    setSelectedWebinar({ ...item, attendees: [] });
    setDetailTab("info");
    setIsLoadingDetail(true);
    setEditError(null);
    try {
      const res = await getAdminWebinarDetailAction(item.id);
      if (res.success && res.data) {
        setSelectedWebinar(res.data);
        setEditForm({
          title: res.data.title,
          description: res.data.description || "",
          speaker: res.data.speaker,
          starts_at: res.data.starts_at ? new Date(res.data.starts_at).toISOString().slice(0, 16) : "",
          ends_at: res.data.ends_at ? new Date(res.data.ends_at).toISOString().slice(0, 16) : "",
          capacity: res.data.capacity,
          status: res.data.status,
          join_url: res.data.join_url || "",
          recording_url: res.data.recording_url || "",
          provider: res.data.provider || "zoom",
        });
      }
    } catch {
      // Graceful retain base
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
        provider: createForm.provider,
      };
      const res = await createAdminWebinarAction(input);
      if (!res.success || !res.data) {
        setCreateError(res.error || "Gagal menjadwalkan sesi webinar");
        setTimeout(() => {
          document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
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
        provider: "zoom",
      });
    } catch (err: any) {
      setCreateError(err.message || "Terjadi kesalahan sistem saat menjadwalkan");
      setTimeout(() => {
        document.getElementById("form-error-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWebinar) return;
    setIsUpdating(true);
    setEditError(null);
    try {
      const input: UpdateAdminWebinarInput = {
        title: editForm.title,
        description: editForm.description,
        speaker: editForm.speaker,
        starts_at: new Date(editForm.starts_at).toISOString(),
        ends_at: new Date(editForm.ends_at).toISOString(),
        capacity: Number(editForm.capacity),
        status: editForm.status,
        join_url: editForm.join_url,
        recording_url: editForm.recording_url,
        provider: editForm.provider,
      };
      const res = await updateAdminWebinarAction(selectedWebinar.id, input);
      if (!res.success || !res.data) {
        setEditError(res.error || "Gagal memperbarui sesi webinar");
        return;
      }
      setWebinars((prev) => prev.map((w) => (w.id === selectedWebinar.id ? res.data! : w)));
      setSelectedWebinar({ ...selectedWebinar, ...res.data! });
      setDetailTab("info");
    } catch (err: any) {
      setEditError(err.message || "Terjadi kesalahan saat menyimpan perubahan");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWebinar = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await deleteAdminWebinarAction(id);
      if (res.success) {
        setWebinars((prev) => prev.filter((w) => w.id !== id));
        setDeleteConfirmId(null);
        if (selectedWebinar?.id === id) {
          setSelectedWebinar(null);
        }
      }
    } catch {
      // Handled
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleAttendance = async (attendeeUserId: string, currentStatus: string) => {
    if (!selectedWebinar) return;
    const newStatus = currentStatus === "present" || currentStatus === "attended" ? "registered" : "attended";
    try {
      const res = await updateAttendanceAction(selectedWebinar.id, attendeeUserId, newStatus);
      if (res.success) {
        setSelectedWebinar({
          ...selectedWebinar,
          attendees: (selectedWebinar.attendees || []).map((a) =>
            a.user_id === attendeeUserId ? { ...a, attendance_state: newStatus === "attended" ? "present" : "registered" } : a
          ),
        });
      }
    } catch {
      // Handled
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
          <p className="mt-1 text-xs text-sky-600 dark:text-sky-400 font-medium">Manajemen Mandiri (LXP Native)</p>
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
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Basis Data Persisten</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">PostgreSQL Riil</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Tersimpan Permanen</p>
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
          className="admin-button-primary text-xs"
        >
          + Jadwalkan Webinar Baru
        </button>
      </div>

      {/* Main Admin Data Table */}
      <AdminDataTable
        title="Daftar Sesi Webinar"
        description="Kelola jadwal, kapasitas peserta, narasumber, dan status siaran webinar platform."
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
          { value: "cancelled", label: "Dibatalkan" },
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
                      : item.status === "cancelled"
                      ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                      : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  }`}
                >
                  {item.status === "upcoming"
                    ? "Akan Datang"
                    : item.status === "in_progress"
                    ? "Live"
                    : item.status === "cancelled"
                    ? "Dibatalkan"
                    : "Selesai"}
                </span>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(item)}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
                >
                  Kelola & Detail
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                  title="Hapus / Batalkan Sesi"
                >
                  Hapus
                </button>
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      {/* Standard Create Modal */}
      {isCreateModalOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsCreateModalOpen(false);
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="admin-card max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Jadwalkan Sesi Webinar Baru</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Isi formulir sesi tatap muka interaktif LXP Teman Belajar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div id="form-error-alert" className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 dark:border-rose-900/50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300">
                <p className="font-bold flex items-center gap-1.5">⚠️ Gagal Menyimpan:</p>
                <p className="mt-1">{createError}</p>
                {isSessionExpired(createError) && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-sm dark:border-sky-700 dark:bg-slate-900 dark:text-sky-300"
                  >
                    Muat Ulang Halaman & Masuk Ulang
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleCreateWebinar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topik / Judul Webinar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Contoh: Best Practices Keamanan Siber Cloud"
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan / Deskripsi Sesi
                </label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Penjelasan ringkas materi dan tujuan sesi webinar…"
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Narasumber <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.speaker}
                  onChange={(e) => setCreateForm({ ...createForm, speaker: e.target.value })}
                  placeholder="Nama lengkap dan gelar narasumber"
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Platform Telekonferensi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createForm.provider}
                    onChange={(e) => setCreateForm({ ...createForm, provider: e.target.value })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="zoom">Zoom (Gratis / Berbayar)</option>
                    <option value="gmeet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="bigbluebutton">BigBlueButton / Jitsi</option>
                    <option value="other">Platform Lainnya / Manual Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kapasitas Kursi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={createForm.capacity}
                    onChange={(e) => setCreateForm({ ...createForm, capacity: Number(e.target.value) })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tautan Masuk Sesi (Join URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={createForm.join_url}
                  onChange={(e) => setCreateForm({ ...createForm, join_url: e.target.value })}
                  placeholder={
                    createForm.provider === "zoom"
                      ? "https://zoom.us/j/... (atau link personal room)"
                      : createForm.provider === "gmeet"
                      ? "https://meet.google.com/xxx-xxxx-xxx"
                      : createForm.provider === "teams"
                      ? "https://teams.microsoft.com/l/meetup-join/..."
                      : "https://..."
                  }
                  className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 font-mono"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {createForm.provider === "zoom" && "💡 Panduan: Jika akun Zoom Gratis, atur durasi maks 40 menit & kuota maks 100 kursi. Akun Zoom Pro/Business mendukung 300–1000 kursi."}
                  {createForm.provider === "gmeet" && "💡 Panduan: Salin tautan rapat dari Google Calendar atau aplikasi Google Meet."}
                  {createForm.provider === "teams" && "💡 Panduan: Salin tautan undangan rapat dari Microsoft Teams."}
                  {createForm.provider === "bigbluebutton" && "💡 Panduan: Salin URL ruang konferensi BigBlueButton atau Jitsi."}
                  {createForm.provider === "other" && "💡 Panduan: Tempelkan tautan webinar, Cisco Webex, atau tautan siaran langsung YouTube Live."}
                </p>
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

      {/* Enhanced Detail & Edit Modal */}
      {selectedWebinar && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdating) setSelectedWebinar(null);
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isUpdating) setSelectedWebinar(null);
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
                disabled={isUpdating}
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
                Kehadiran Peserta ({selectedWebinar.attendees?.length || selectedWebinar.enrolled_count})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("edit")}
                className={`py-2 px-4 border-b-2 transition-colors ${
                  detailTab === "edit"
                    ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                Sunting Sesi
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
                      {new Date(selectedWebinar.starts_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} •{" "}
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
                    <p className="text-slate-500 dark:text-slate-400 font-semibold">Status Sesi</p>
                    <p className="text-sky-600 dark:text-sky-400 font-bold mt-1 uppercase">
                      {selectedWebinar.status}
                    </p>
                  </div>
                </div>

                {selectedWebinar.join_url && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Tautan Ruang Pertemuan ({selectedWebinar.provider.toUpperCase()}):
                      </p>
                      <a
                        href={selectedWebinar.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-mono text-sky-700 underline dark:text-sky-300 truncate"
                      >
                        {selectedWebinar.join_url}
                      </a>
                    </div>
                    <a
                      href={selectedWebinar.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition shrink-0"
                    >
                      Buka Ruang Sesi (Host) ↗
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

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(selectedWebinar.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400"
                  >
                    Hapus Sesi Ini
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailTab("edit")}
                      className="admin-button-primary text-xs"
                    >
                      Sunting Sesi
                    </button>
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
            ) : detailTab === "attendance" ? (
              <div className="space-y-4">
                {(() => {
                  const atts = selectedWebinar.attendees || [];
                  const totalAtts = atts.length;
                  const presentCount = atts.filter((a) => a.attendance_state === "present" || a.attendance_state === "attended").length;
                  const absentCount = totalAtts - presentCount;
                  const rate = totalAtts > 0 ? Math.round((presentCount / totalAtts) * 100) : 0;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Total Pendaftar</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalAtts}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Telah Hadir</p>
                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{presentCount}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Belum Hadir</p>
                        <p className="text-sm font-black text-slate-600 dark:text-slate-300 mt-0.5">{absentCount}</p>
                      </div>
                      <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 dark:border-sky-900/40 dark:bg-sky-950/30">
                        <p className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold">Tingkat Hadir</p>
                        <p className="text-sm font-black text-sky-700 dark:text-sky-300 mt-0.5">{rate}%</p>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar peserta yang mendaftar ke sesi ini. Anda dapat menandai presensi kehadiran peserta secara manual di bawah ini.
                </p>

                {selectedWebinar.attendees && selectedWebinar.attendees.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Nama Peserta</th>
                          <th className="px-3 py-2 font-semibold">Status Presensi</th>
                          <th className="px-3 py-2 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {selectedWebinar.attendees.map((att, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                              {att.name || "Peserta"}
                              <span className="block text-[11px] text-slate-500">{att.email}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  att.attendance_state === "present" || att.attendance_state === "attended"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : att.attendance_state === "absent"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                                }`}
                              >
                                {att.attendance_state === "present" || att.attendance_state === "attended"
                                  ? "Hadir"
                                  : att.attendance_state === "absent"
                                  ? "Tidak Hadir"
                                  : "Terdaftar"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(att.user_id || "", att.attendance_state)}
                                className="rounded px-2 py-1 text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                              >
                                {att.attendance_state === "present" || att.attendance_state === "attended" ? "Set Belum Hadir" : "Tandai Hadir"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">Belum ada peserta yang mendaftar ke sesi ini.</p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWebinar(null)}
                    className="admin-button-secondary text-xs"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Tab */
              <form onSubmit={handleUpdateWebinar} className="space-y-4">
                {editError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40">
                    <p className="font-bold">⚠️ Gagal Memperbarui:</p>
                    <p className="mt-0.5">{editError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topik / Judul Webinar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ringkasan / Deskripsi Sesi
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Narasumber <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.speaker}
                      onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Status Sesi
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="upcoming">Akan Datang (Upcoming)</option>
                      <option value="in_progress">Sedang Berlangsung (Live)</option>
                      <option value="completed">Selesai (Completed)</option>
                      <option value="cancelled">Dibatalkan (Cancelled)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Waktu Mulai
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editForm.starts_at}
                      onChange={(e) => setEditForm({ ...editForm, starts_at: e.target.value })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Waktu Selesai
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editForm.ends_at}
                      onChange={(e) => setEditForm({ ...editForm, ends_at: e.target.value })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Platform Telekonferensi
                    </label>
                    <select
                      value={editForm.provider}
                      onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="zoom">Zoom (Gratis / Berbayar)</option>
                      <option value="gmeet">Google Meet</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="bigbluebutton">BigBlueButton / Jitsi</option>
                      <option value="other">Platform Lainnya / Manual Link</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kapasitas Kursi
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      required
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                      className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Masuk Sesi (Join URL)
                  </label>
                  <input
                    type="url"
                    value={editForm.join_url}
                    onChange={(e) => setEditForm({ ...editForm, join_url: e.target.value })}
                    placeholder={
                      editForm.provider === "zoom"
                        ? "https://zoom.us/j/... (atau link personal room)"
                        : editForm.provider === "gmeet"
                        ? "https://meet.google.com/xxx-xxxx-xxx"
                        : editForm.provider === "teams"
                        ? "https://teams.microsoft.com/l/meetup-join/..."
                        : "https://..."
                    }
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {editForm.provider === "zoom" && "💡 Panduan: Jika akun Zoom Gratis, atur durasi maks 40 menit & kuota maks 100 kursi."}
                    {editForm.provider === "gmeet" && "💡 Panduan: Salin tautan rapat dari Google Calendar atau Google Meet."}
                    {editForm.provider === "teams" && "💡 Panduan: Salin tautan rapat dari Microsoft Teams."}
                    {editForm.provider === "other" && "💡 Panduan: Tempelkan tautan webinar atau YouTube Live."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Rekaman Sesi (Opsional)
                  </label>
                  <input
                    type="url"
                    value={editForm.recording_url}
                    onChange={(e) => setEditForm({ ...editForm, recording_url: e.target.value })}
                    placeholder="https://storage.../rekaman.mp4"
                    className="cuba-input w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDetailTab("info")}
                    className="admin-button-secondary text-xs"
                    disabled={isUpdating}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="admin-button-primary text-xs"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Menyimpan Perubahan…" : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Standard Delete Confirmation Modal */}
      {deleteConfirmId && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeleteConfirmId(null);
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeleteConfirmId(null);
          }}
        >
          <div
            className="admin-card max-w-sm w-full p-6 space-y-4 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Batalkan / Hapus Sesi Webinar?</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sesi webinar #{deleteConfirmId} akan dihapus secara permanen dari basis data platform. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="admin-button-secondary text-xs"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWebinar(deleteConfirmId)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Menghapus…" : "Ya, Hapus Sesi"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
