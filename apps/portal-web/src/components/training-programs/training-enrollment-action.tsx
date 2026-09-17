"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { TrainingCohort, TrainingEnrollmentStatus } from "@/lib/training-programs";

const emptySubscribe = () => () => {};

type Props = {
  slug: string;
  programTitle: string;
  cohorts?: TrainingCohort[];
  authenticated: boolean;
  initialEnrollmentStatus: TrainingEnrollmentStatus | null;
  progressCTA?: {
    kind: string;
    label: string;
    url?: string;
    disabled?: boolean;
    subtext?: string;
  };
  primaryCourseUrl?: string;
};

export function TrainingEnrollmentAction({
  slug,
  programTitle,
  cohorts = [],
  authenticated,
  initialEnrollmentStatus,
  progressCTA,
  primaryCourseUrl,
}: Props) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<TrainingEnrollmentStatus | null>(
    initialEnrollmentStatus
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>(
    cohorts[0]?.id || ""
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Lock body & html scrolling and listen to Escape key when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isModalOpen]);

  const enrollment = enrollmentStatus?.enrollment;
  const isEnrolledInMoodle = Boolean(
    progressCTA?.url && (progressCTA.kind === "start" || progressCTA.kind === "review")
  );
  const isConfirmed = enrollment?.status === "confirmed" || isEnrolledInMoodle;
  const isPending = enrollment?.status === "pending" && !isConfirmed;
  const isRejected = enrollment?.status === "rejected" && !isConfirmed;

  const targetCourseUrl =
    progressCTA?.url ||
    primaryCourseUrl ||
    "http://moodle.teman-belajar.localhost:8080";

  async function handleRefreshStatus() {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/training-programs/${encodeURIComponent(slug)}/enroll`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setEnrollmentStatus(json.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmitEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCohortId) {
      setErrorMessage("Silakan pilih gelombang / kohort pelatihan.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/training-programs/${encodeURIComponent(slug)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohort_id: selectedCohortId,
          notes: notes.trim(),
        }),
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.detail || data.error || "Gagal mengirimkan permohonan pendaftaran."
        );
        return;
      }

      setSuccessNotice("Permohonan pendaftaran Anda berhasil dikirim!");
      setIsModalOpen(false);
      setEnrollmentStatus({
        has_application: true,
        enrollment: data,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan jaringan saat mendaftar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // State 1: Unauthenticated
  if (!authenticated) {
    return (
      <div className="space-y-3">
        <Link
          href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/training-programs/${slug}`)}`}
          className="portal-button-primary w-full text-center flex items-center justify-center gap-2 py-3 shadow-md hover:shadow-lg transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Masuk untuk Mendaftar
        </Link>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-2">
          Masuk dengan akun Teman Belajar Anda untuk mengajukan pendaftaran pelatihan ini.
        </p>
      </div>
    );
  }

  // State 2: Confirmed / Enrolled
  if (isConfirmed) {
    return (
      <div className="space-y-3">
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
          <span className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Pendaftaran Dikonfirmasi
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
              {enrollment?.cohort_label || "Akses Moodle Aktif"}
            </p>
          </div>
        </div>

        <a
          href={targetCourseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-button-primary w-full text-center flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mulai Pembelajaran di Moodle
        </a>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-2">
          Anda telah terdaftar resmi. Klik tombol di atas untuk langsung membuka materi pelatihan di Moodle tanpa perlu mendaftar ulang.
        </p>
      </div>
    );
  }

  // State 3: Pending Confirmation
  if (isPending) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="size-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            </span>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Menunggu Konfirmasi Admin
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {enrollment?.cohort_label}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Permohonan pendaftaran Anda telah diterima dan sedang ditinjau oleh administrator pelatihan. Akses kursus Moodle akan otomatis aktif setelah disetujui.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
          className="portal-button-secondary w-full text-center flex items-center justify-center gap-2 py-2 text-xs"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? "Memeriksa Status..." : "Periksa Status Terbaru"}
        </button>
      </div>
    );
  }

  // Modal component rendered via createPortal on document.body
  const modalContent =
    mounted && isModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-modal-title"
          >
            <div
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Formulir Pendaftaran
                  </span>
                  <h3
                    id="enrollment-modal-title"
                    className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                  >
                    {programTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Tutup modal"
                >
                  ✕
                </button>
              </div>

              {errorMessage ? (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {errorMessage}
                </div>
              ) : null}

              <form onSubmit={handleSubmitEnrollment} className="space-y-5">
                {/* Pilihan Kohort / Gelombang */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Pilih Gelombang / Kohort Pelatihan <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {cohorts.map((cohort) => {
                      const isSelected = selectedCohortId === cohort.id;
                      return (
                        <label
                          key={cohort.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cohort"
                            value={cohort.id}
                            checked={isSelected}
                            onChange={() => setSelectedCohortId(cohort.id)}
                            className="mt-1 text-primary focus:ring-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {cohort.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Status: <span className="font-medium capitalize text-slate-700 dark:text-slate-300">{cohort.status}</span>
                              {cohort.starts_at ? ` • Mulai: ${new Date(cohort.starts_at).toLocaleDateString("id-ID")}` : ""}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan Motivasi */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Catatan / Alasan Mengikuti Pelatihan (Opsional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ceritakan singkat tujuan Anda atau latar belakang keahlian terkait..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                    maxLength={2000}
                  />
                </div>

                {/* Aksi Modal */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedCohortId}
                    className="portal-button-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Mengirimkan...
                      </>
                    ) : (
                      "Kirim Pendaftaran"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  // State 4: Rejected
  if (isRejected) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pendaftaran Belum Disetujui
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
            {enrollment?.rejection_reason || "Persyaratan pelatihan belum terpenuhi."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            setIsModalOpen(true);
          }}
          className="portal-button-primary w-full text-center py-2.5 text-xs"
        >
          Ajukan Ulang Pendaftaran
        </button>

        {modalContent}
      </div>
    );
  }

  // State 5: Can Apply (No application yet or cancelled)
  return (
    <div className="space-y-3">
      {successNotice ? (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
          {successNotice}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setErrorMessage("");
          setIsModalOpen(true);
        }}
        disabled={cohorts.length === 0}
        className="portal-button-primary w-full text-center flex items-center justify-center gap-2 py-3 shadow-md hover:shadow-lg transition-all text-sm font-bold"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Daftar Pelatihan
      </button>

      <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-2">
        {cohorts.length > 0
          ? `${cohorts.length} gelombang pendaftaran tersedia. Pendaftaran akan ditinjau administrator.`
          : "Belum ada gelombang pendaftaran yang dibuka untuk pelatihan ini."}
      </p>

      {modalContent}
    </div>
  );
}
