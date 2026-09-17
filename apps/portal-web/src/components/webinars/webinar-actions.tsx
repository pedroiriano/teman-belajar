"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicWebinarItem } from "@/lib/webinars";

function emptySubscribe() {
  return () => {};
}

function generateIdempotencyKey(action: string, id: number): string {
  return `${action}-${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WebinarActions({
  webinar,
  isLoggedIn,
}: {
  webinar: PublicWebinarItem;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [isRegistered, setIsRegistered] = useState(webinar.registered);
  const [registeredCount, setRegisteredCount] = useState(webinar.registered_count);
  const [joinUrl, setJoinUrl] = useState<string | undefined>(webinar.join_url);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Scroll lock & Escape key listener
  useEffect(() => {
    if (!isEnrollModalOpen && !isCancelModalOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        setIsEnrollModalOpen(false);
        setIsCancelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isEnrollModalOpen, isCancelModalOpen, isSubmitting]);

  const handleRegister = async () => {
    setIsSubmitting(true);
    setActionError(null);
    const key = generateIdempotencyKey("reg", webinar.id);

    try {
      const res = await fetch(`/api/webinars/${webinar.id}/registration`, {
        method: "POST",
        headers: {
          "Idempotency-Key": key,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setIsRegistered(true);
        setRegisteredCount((c) => c + 1);
        if (data?.join_url) {
          setJoinUrl(data.join_url);
        }
        setIsEnrollModalOpen(false);
        router.refresh();
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.detail || err?.title || "Gagal mendaftar webinar. Silakan coba beberapa saat lagi.");
      }
    } catch {
      setActionError("Terjadi gangguan koneksi jaringan. Periksa koneksi internet Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    setActionError(null);
    const key = generateIdempotencyKey("can", webinar.id);

    try {
      const res = await fetch(`/api/webinars/${webinar.id}/registration`, {
        method: "DELETE",
        headers: {
          "Idempotency-Key": key,
        },
      });

      if (res.ok) {
        setIsRegistered(false);
        setRegisteredCount((c) => Math.max(0, c - 1));
        setJoinUrl(undefined);
        setIsCancelModalOpen(false);
        router.refresh();
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.detail || err?.title || "Gagal membatalkan pendaftaran.");
      }
    } catch {
      setActionError("Terjadi gangguan koneksi jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLive = webinar.status === "live";
  const isCompleted = webinar.status === "completed";
  const isCancelled = webinar.status === "cancelled";
  const isFull = registeredCount >= webinar.capacity;

  const platformLabel =
    webinar.source === "gmeet"
      ? "Google Meet"
      : webinar.source === "teams"
      ? "Microsoft Teams"
      : webinar.source === "zoom"
      ? "Zoom"
      : "Ruang Sesi";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Partisipasi Webinar</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Kapasitas: <span className="font-semibold text-slate-700 dark:text-slate-300">{registeredCount} / {webinar.capacity} Kursi Terisi</span>
      </p>

      {/* Action Area */}
      <div className="mt-5 space-y-3">
        {!isLoggedIn ? (
          <div>
            <Link
              href={`/api/auth/signin?callbackUrl=/webinars/${webinar.id}`}
              className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
            >
              Masuk untuk Mendaftar Sesi
            </Link>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Gunakan akun Teman Belajar Anda untuk bergabung ke sesi ini secara gratis.
            </p>
          </div>
        ) : isCancelled ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <p className="font-bold">⚠️ Sesi Dibatalkan</p>
            <p className="mt-0.5">Sesi webinar ini telah dibatalkan oleh penyelenggara.</p>
          </div>
        ) : isRegistered ? (
          /* User is Registered */
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                ✓
              </span>
              <div>
                <p className="font-bold">Anda Telah Terdaftar pada Sesi Ini</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Simpan jadwal di kalender Anda. Pengingat akan aktif menjelang sesi.
                </p>
              </div>
            </div>

            {/* If Live: Prominent Join Button */}
            {isLive ? (
              joinUrl ? (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition animate-pulse"
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  Masuk Ruang Pertemuan ({platformLabel}) ↗
                </a>
              ) : (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                  <p className="font-bold">Sesi Sedang Berlangsung</p>
                  <p className="mt-0.5">Tautan ruang sesi sedang disiapkan oleh host penyelenggara.</p>
                </div>
              )
            ) : isCompleted ? (
              webinar.recording_url ? (
                <a
                  href={webinar.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
                >
                  ▶ Tonton Rekaman Sesi ↗
                </a>
              ) : (
                <p className="text-center text-xs text-slate-500 italic py-1">
                  Sesi telah selesai. Tautan rekaman akan ditampilkan jika telah diunggah oleh penyelenggara.
                </p>
              )
            ) : (
              /* Upcoming */
              <div className="space-y-2">
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                  Tautan masuk ke ruang pertemuan akan aktif di halaman ini saat sesi live dimulai.
                </p>
                {webinar.cancellation_allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setIsCancelModalOpen(true);
                    }}
                    className="w-full text-center text-xs font-semibold text-rose-600 hover:text-rose-800 dark:text-rose-400 pt-1"
                  >
                    Batalkan Pendaftaran Saya
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* User NOT Registered */
          isCompleted ? (
            webinar.recording_url ? (
              <a
                href={webinar.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition"
              >
                ▶ Tonton Rekaman Sesi ↗
              </a>
            ) : (
              <p className="text-center text-xs text-slate-500 italic py-2">
                Sesi webinar ini telah selesai.
              </p>
            )
          ) : isFull ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-white">Kuota Kursi Penuh</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Seluruh {webinar.capacity} kursi pada sesi ini telah terisi.</p>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsEnrollModalOpen(true);
                }}
                className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-700 transition"
              >
                Daftar Sesi Webinar (Gratis)
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Pendaftaran terbuka • Tersedia {Math.max(0, webinar.capacity - registeredCount)} kursi lagi
              </p>
            </div>
          )
        )}
      </div>

      {/* Confirmation Modal for Enrollment */}
      {isEnrollModalOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsEnrollModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold">
                📅
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Pendaftaran Webinar</h4>
                <p className="text-xs text-slate-500">Pastikan jadwal Anda sesuai dengan sesi ini.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white">{webinar.title}</p>
              <p><span className="text-slate-500 font-medium">Narasumber:</span> {webinar.speaker}</p>
              <p>
                <span className="text-slate-500 font-medium">Waktu:</span>{" "}
                {new Date(webinar.starts_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} •{" "}
                {new Date(webinar.starts_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </p>
              <p><span className="text-slate-500 font-medium">Platform:</span> {platformLabel}</p>
            </div>

            {actionError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <p className="font-bold">⚠️ Terjadi Kesalahan:</p>
                <p className="mt-0.5">{actionError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={isSubmitting}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Mendaftarkan…" : "Konfirmasi & Daftar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal for Cancellation */}
      {isCancelModalOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsCancelModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Batalkan Pendaftaran Webinar?</h4>
            <p className="mt-1 text-xs text-slate-500">
              Kursi Anda akan dilepaskan dan dapat diambil oleh peserta lain.
            </p>

            {actionError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <p className="font-bold">⚠️ Terjadi Kesalahan:</p>
                <p className="mt-0.5">{actionError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Membatalkan…" : "Ya, Batalkan Pendaftaran"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
