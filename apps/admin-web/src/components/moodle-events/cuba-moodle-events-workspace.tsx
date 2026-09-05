"use client";

import { useState, useTransition, useMemo } from "react";
import type {
  MoodleEventSummary,
  MoodleInboxEvent,
  MoodleEventStatus,
} from "@/types/moodle-event";
import {
  listMoodleEventsAction,
  getMoodleEventsSummaryAction,
  requeueMoodleEventAction,
} from "@/app/actions/moodle-events";
import { AdminDataTable } from "@/components/admin-data-table";

interface CubaMoodleEventsWorkspaceProps {
  initialSummary: MoodleEventSummary;
  initialEvents: MoodleInboxEvent[];
  initialTotal: number;
}

export function CubaMoodleEventsWorkspace({
  initialSummary,
  initialEvents,
  initialTotal,
}: CubaMoodleEventsWorkspaceProps) {
  const [summary, setSummary] = useState<MoodleEventSummary>(initialSummary);
  const [events, setEvents] = useState<MoodleInboxEvent[]>(initialEvents);
  const [total, setTotal] = useState<number>(initialTotal);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("occurred_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedEvent, setSelectedEvent] = useState<MoodleInboxEvent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [requeuingId, setRequeuingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      let comparison = 0;
      if (sortKey === "event_id") {
        comparison = (a.event_id || "").localeCompare(b.event_id || "");
      } else if (sortKey === "event_type") {
        comparison = (a.event_type || "").localeCompare(b.event_type || "");
      } else if (sortKey === "subject_id") {
        comparison = (a.subject_id || "").localeCompare(b.subject_id || "");
      } else if (sortKey === "occurred_at") {
        const timeA = new Date(a.occurred_at).getTime();
        const timeB = new Date(b.occurred_at).getTime();
        comparison = timeA - timeB;
      } else if (sortKey === "attempts") {
        comparison = (a.attempts || 0) - (b.attempts || 0);
      } else if (sortKey === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [events, sortKey, sortDirection]);

  const fetchPage = (targetPage: number, targetSize: number, status: string, eventType: string) => {
    startTransition(async () => {
      const res = await listMoodleEventsAction({
        status: status === "all" ? undefined : status,
        event_type: eventType === "all" ? undefined : eventType,
        limit: targetSize,
        offset: (targetPage - 1) * targetSize,
      });
      if (res.success && res.data) {
        setEvents(res.data.items);
        setTotal(res.data.total);
      }
    });
  };

  const handleFilterChange = (newStatus: string, newType: string) => {
    setStatusFilter(newStatus);
    setEventTypeFilter(newType);
    setPage(1);
    setSelectedIds(new Set());
    setFeedback(null);
    fetchPage(1, pageSize, newStatus, newType);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds(new Set());
    fetchPage(newPage, pageSize, statusFilter, eventTypeFilter);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedIds(new Set());
    fetchPage(1, newSize, statusFilter, eventTypeFilter);
  };

  const allCurrentKeys = events.map((e) => e.event_id);
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

  const handleRefresh = () => {
    startTransition(async () => {
      const [sumRes, listRes] = await Promise.all([
        getMoodleEventsSummaryAction(),
        listMoodleEventsAction({
          status: statusFilter === "all" ? undefined : statusFilter,
          event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
          limit: 50,
          offset: 0,
        }),
      ]);
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (listRes.success && listRes.data) {
        setEvents(listRes.data.items);
        setTotal(listRes.data.total);
      }
    });
  };

  const handleRequeue = async (eventId: string) => {
    if (!confirm(`Apakah Anda yakin ingin memasukkan ulang event ${eventId} ke antrean pemrosesan?`)) {
      return;
    }

    setRequeuingId(eventId);
    setFeedback(null);

    const res = await requeueMoodleEventAction(eventId);
    setRequeuingId(null);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `Event ${eventId} berhasil dikembalikan ke antrean pemrosesan (status: pending).`,
      });
      // Refresh summary and list
      handleRefresh();
    } else {
      setFeedback({
        type: "error",
        message: res.error || `Gagal memasukkan ulang event ${eventId}.`,
      });
    }
  };

  const getStatusBadge = (status: MoodleEventStatus) => {
    switch (status) {
      case "processed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
            Processed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800">
            Processing
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
            Pending
          </span>
        );
      case "dead_letter":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">
            Dead Letter
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-cuba-component="moodle-events-workspace">
      {/* Top Banner & Context */}
      <div className="admin-card p-5 border-l-4 border-l-sky-500 bg-sky-50/40 dark:bg-sky-950/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Moodle Event Inbox & Rekonsiliasi Integrasi
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Memantau antrean peristiwa integrasi dari Moodle LMS ke Teman Belajar, memeriksa integritas fingerprint,
                status pemrosesan, dan memulihkan peristiwa bermasalah (*dead-letter*) kembali ke antrean.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-900/80 transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Segarkan
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="admin-card p-4 bg-white dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Peristiwa</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</p>
        </div>
        <div className="admin-card p-4 bg-white dark:bg-slate-800 border-b-2 border-b-emerald-500">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Berhasil (Processed)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.processed}</p>
        </div>
        <div className="admin-card p-4 bg-white dark:bg-slate-800 border-b-2 border-b-yellow-500">
          <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Menunggu (Pending)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.pending}</p>
        </div>
        <div className="admin-card p-4 bg-white dark:bg-slate-800 border-b-2 border-b-sky-500">
          <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Diproses (Processing)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.processing}</p>
        </div>
        <div className="admin-card p-4 bg-white dark:bg-slate-800 border-b-2 border-b-rose-500">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Gagal (Dead Letter)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.dead_letter}</p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Events AdminDataTable */}
      <AdminDataTable
        title="Daftar Peristiwa Moodle"
        description="Log antrean peristiwa integrasi Moodle LMS dengan verifikasi integritas data."
        itemCount={events.length}
        headers={[
          { label: "Event ID / Sumber", key: "event_id", sortable: true },
          { label: "Tipe Peristiwa", key: "event_type", sortable: true },
          { label: "Subjek", key: "subject_id", sortable: true },
          { label: "Waktu Kejadian", key: "occurred_at", sortable: true },
          { label: "Percobaan", key: "attempts", align: "center", sortable: true },
          { label: "Status", key: "status", sortable: true },
          { label: "Aksi", key: "actions", align: "right" },
        ]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        emptyState="Tidak ada peristiwa yang cocok dengan filter yang dipilih."
        statusFilter={statusFilter}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "pending", label: "Pending" },
          { value: "processing", label: "Processing" },
          { value: "processed", label: "Processed" },
          { value: "dead_letter", label: "Dead Letter" },
        ]}
        onStatusFilterChange={(s) => handleFilterChange(s, eventTypeFilter)}
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 sr-only">Tipe Peristiwa</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
              className="admin-input !h-9 !w-auto !py-1 text-xs"
              aria-label="Filter tipe peristiwa"
            >
              <option value="all">Semua Tipe</option>
              <option value="learning.user_enrolled">learning.user_enrolled</option>
              <option value="learning.course_completed">learning.course_completed</option>
              <option value="learning.activity_completed">learning.activity_completed</option>
              <option value="learning.badge_awarded">learning.badge_awarded</option>
              <option value="learning.certificate_issued">learning.certificate_issued</option>
              <option value="learning.course_updated">learning.course_updated</option>
            </select>
          </div>
        }
        selectable={true}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelectAll={handleToggleSelectAll}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[10, 20, 50]}
      >
        {sortedEvents.map((event) => {
          const isChecked = selectedIds.has(event.event_id);
          return (
            <tr
              key={event.event_id}
              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                isChecked ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
              }`}
            >
              <td className="w-10 px-4 py-3.5 text-center">
                <input
                  type="checkbox"
                  className="cuba-checkbox h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  checked={isChecked}
                  onChange={() => handleToggleRow(event.event_id)}
                  aria-label={`Pilih event ${event.event_id}`}
                />
              </td>
              <td className="py-3.5 px-4">
                <div className="font-mono text-slate-900 dark:text-white font-semibold">
                  {event.event_id}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {event.source} (v{event.schema_version})
                </div>
              </td>
              <td className="py-3.5 px-4">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {event.event_type}
                </span>
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                {event.subject_id}
              </td>
              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {new Date(event.occurred_at).toLocaleString("id-ID", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-3.5 px-4 text-center">
                <span
                  className={`inline-block font-mono font-medium ${
                    event.attempts > 3
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {event.attempts}
                </span>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                {getStatusBadge(event.status)}
                {event.error_category && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {event.error_category}
                  </div>
                )}
              </td>
              <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Detail
                </button>
                {event.status === "dead_letter" && (
                  <button
                    type="button"
                    onClick={() => handleRequeue(event.event_id)}
                    disabled={requeuingId === event.event_id}
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors disabled:opacity-50"
                  >
                    {requeuingId === event.event_id ? "Memproses..." : "Requeue"}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </AdminDataTable>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="admin-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Detail Peristiwa: <span className="font-mono text-sky-600 dark:text-sky-400">{selectedEvent.event_id}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEvent.event_type}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedEvent.status)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Percobaan</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedEvent.attempts}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Subjek ID</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-100 truncate block">
                    {selectedEvent.subject_id}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Sumber</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedEvent.source}</span>
                </div>
              </div>

              {selectedEvent.error_category && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                  <span className="font-semibold text-rose-800 dark:text-rose-300 block">Kategori Kesalahan:</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400 text-[11px] mt-0.5 block">
                    {selectedEvent.error_category}
                  </span>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Fingerprint (SHA-256):</span>
                <p className="p-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">
                  {selectedEvent.fingerprint}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payload JSON:</span>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>Waktu Kejadian: {new Date(selectedEvent.occurred_at).toISOString()}</div>
                <div>Diterima di Inbox: {new Date(selectedEvent.received_at).toISOString()}</div>
                {selectedEvent.processed_at && (
                  <div>Selesai Diproses: {new Date(selectedEvent.processed_at).toISOString()}</div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                {selectedEvent.status === "dead_letter" && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedEvent.event_id;
                      setSelectedEvent(null);
                      handleRequeue(id);
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors"
                  >
                    Requeue Peristiwa Ini
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
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
