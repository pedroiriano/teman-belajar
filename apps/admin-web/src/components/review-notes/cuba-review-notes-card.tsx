"use client";

import { useMemo, useState } from "react";
import type { ReviewNote } from "@/app/actions/review-notes";
import { createReviewNoteAction } from "@/app/actions/review-notes";
import { AdminIcon } from "@/components/admin-icon";

interface CubaReviewNotesCardProps {
  entityType: string;
  entityId: string;
  contentTitle?: string;
  notes: ReviewNote[];
  canAddNote?: boolean;
  onNoteAdded?: (newNote: ReviewNote) => void;
  className?: string;
}

const actionBadges: Record<
  string,
  { label: string; badgeClass: string; icon: "alert" | "check" | "edit" }
> = {
  request_changes: {
    label: "Perlu Revisi",
    badgeClass:
      "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60",
    icon: "alert",
  },
  reject: {
    label: "Ditolak ke Draf",
    badgeClass:
      "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    icon: "alert",
  },
  approved: {
    label: "Disetujui",
    badgeClass:
      "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    icon: "check",
  },
  published: {
    label: "Diterbitkan",
    badgeClass:
      "bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
    icon: "check",
  },
  note: {
    label: "Catatan Editorial",
    badgeClass:
      "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    icon: "edit",
  },
};

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "ED";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function CubaReviewNotesCard({
  entityType,
  entityId,
  contentTitle,
  notes,
  canAddNote = true,
  onNoteAdded,
  className = "",
}: CubaReviewNotesCardProps) {
  const [items, setItems] = useState<ReviewNote[]>(notes);
  const [filterMode, setFilterMode] = useState<"all" | "revisions">("all");
  const [newNoteText, setNewNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state if parent passes updated notes
  if (notes !== items && notes.length !== items.length) {
    setItems(notes);
  }

  const latestNote = items[0];
  const hasRequestChanges =
    latestNote &&
    (latestNote.action === "request_changes" || latestNote.action === "reject");

  const revisionCount = useMemo(
    () =>
      items.filter(
        (n) => n.action === "request_changes" || n.action === "reject"
      ).length,
    [items]
  );

  const displayedItems = useMemo(() => {
    if (filterMode === "revisions") {
      return items.filter(
        (n) => n.action === "request_changes" || n.action === "reject"
      );
    }
    return items;
  }, [items, filterMode]);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const res = await createReviewNoteAction(
      entityType,
      entityId,
      "note",
      newNoteText.trim(),
      contentTitle
    );

    setIsSubmitting(false);

    if (res.success && res.data) {
      const created = res.data;
      setItems((prev) => [created, ...prev]);
      setNewNoteText("");
      setIsFormOpen(false);
      if (onNoteAdded) {
        onNoteAdded(created);
      }
    } else {
      setError(res.error || "Gagal menyimpan catatan editorial.");
    }
  };

  return (
    <section
      className={`admin-card overflow-hidden transition-all duration-200 ${
        hasRequestChanges
          ? "border-yellow-300/80 dark:border-yellow-700/60 shadow-sm"
          : ""
      } ${className}`}
      data-cuba-component="review-notes-card"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 p-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`rounded-xl p-2 ${
              hasRequestChanges
                ? "bg-yellow-100/70 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400"
                : "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400"
            }`}
          >
            <AdminIcon name="message" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Catatan Peninjauan & Editorial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {items.length === 0
                ? "Belum ada catatan peninjauan."
                : `${items.length} catatan terekam pada artikel ini.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && revisionCount > 0 && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 p-0.5 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  filterMode === "all"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Semua ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("revisions")}
                className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  filterMode === "revisions"
                    ? "bg-yellow-100 text-yellow-900 shadow-sm dark:bg-yellow-950/60 dark:text-yellow-300"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Perlu Revisi ({revisionCount})
              </button>
            </div>
          )}

          {canAddNote && (
            <button
              type="button"
              onClick={() => setIsFormOpen((prev) => !prev)}
              className="admin-button-secondary !py-1.5 !px-3 !text-xs"
            >
              <AdminIcon name="plus" className="h-3.5 w-3.5 mr-1" />
              {isFormOpen ? "Tutup Form" : "Tambah Catatan"}
            </button>
          )}
        </div>
      </div>

      {/* Prominent Alert Banner if Returned to Draft / Changes Requested */}
      {hasRequestChanges && (
        <div className="border-b border-yellow-200 bg-yellow-50/70 px-4 py-3 sm:px-6 dark:border-yellow-800/40 dark:bg-yellow-950/20">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full bg-yellow-400/20 p-1 text-yellow-800 dark:text-yellow-400">
              <AdminIcon name="alert" className="h-4 w-4" />
            </div>
            <div className="text-xs leading-relaxed text-yellow-900 dark:text-yellow-200">
              <span className="font-bold">Masukan Terakhir Peninjau: </span>
              {latestNote.notes}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Note Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-slate-200/80 bg-slate-50/50 p-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <label
            htmlFor="new-review-note"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Tulis Catatan / Klarifikasi Editorial
          </label>
          <textarea
            id="new-review-note"
            rows={3}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Berikan masukan perbaikan, konfirmasi editorial, atau tindak lanjut revisi…"
            className="admin-textarea !text-xs mb-2"
            disabled={isSubmitting}
            required
          />
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-2 font-medium">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setError(null);
              }}
              disabled={isSubmitting}
              className="admin-button-secondary !py-1 !px-3 !text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newNoteText.trim()}
              className="admin-button !py-1 !px-3 !text-xs"
            >
              {isSubmitting ? "Menyimpan…" : "Kirim Catatan"}
            </button>
          </div>
        </form>
      )}

      {/* Notes Timeline List */}
      <div className="p-4 sm:p-6 space-y-4">
        {displayedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {filterMode === "revisions"
              ? "Tidak ada catatan dengan status perlu revisi."
              : "Belum ada catatan atau umpan balik peninjau untuk konten ini."}
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {displayedItems.map((note) => {
              const meta = actionBadges[note.action] || actionBadges.note;
              const initials = getInitials(note.reviewer_name);
              const isCopied = copiedId === note.id;

              return (
                <div key={note.id} className="relative group">
                  {/* Dot on line */}
                  <div className="absolute -left-[19px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-sky-500 shadow-sm" />

                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        {/* Reviewer Avatar Initials */}
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                          {initials}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">
                            {note.reviewer_name}
                          </span>
                          <span
                            className={`ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                          >
                            <AdminIcon name={meta.icon} className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <time className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatTimestamp(note.created_at)}
                        </time>
                        <button
                          type="button"
                          onClick={() => handleCopy(note.id, note.notes)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                          title="Salin isi catatan"
                        >
                          {isCopied ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Tersalin!
                            </span>
                          ) : (
                            <span>Salin</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed pl-9">
                      {note.notes}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
