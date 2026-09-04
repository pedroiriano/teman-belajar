"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { AdminClientPagination } from "@/components/admin-pagination";

type NotificationItem = {
  id: string;
  event_type: string;
  title: string;
  body: string;
  deep_link: string;
  priority: "normal" | "high";
  read_at?: string;
  created_at: string;
};

type Page = {
  data: NotificationItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  unread_count: number;
};

type Preference = { event_type: string; enabled: boolean };
type LoadState = "loading" | "ready" | "empty" | "unauthorized" | "degraded" | "error";

interface ToastItem {
  id: string;
  title: string;
  body: string;
  module_label?: string;
  action_label?: string;
  action?: "approved" | "draft" | "published";
  deep_link?: string;
}

const eventLabels: Record<string, string> = {
  "learning.reminder": "Pengingat belajar",
  "learning.course_updated": "Pembaruan kursus",
  "learning.course_completed": "Kursus selesai",
  "content.workflow": "Alur kerja konten",
  "system.notice": "Informasi sistem",
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );

const safeAdminLink = (value: string) =>
  value === "/dashboard" || value.startsWith("/dashboard/")
    ? value
    : "/dashboard/notifications";

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error("Notifikasi gagal dimuat") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function stateFrom(error: unknown): LoadState {
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 502 || status === 503) return "degraded";
  return "error";
}

export function AdminNotificationCenter({ mode = "bell" }: { mode?: "bell" | "page" }) {
  const router = useRouter();
  const [open, setOpen] = useState(mode === "page");
  const [state, setState] = useState<LoadState>("loading");
  const [pageData, setPageData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "unread">("all");
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const loadSummary = useCallback(async () => {
    try {
      const result = await requestJSON<{ unread_count: number }>("/api/bff/notifications/summary");
      setPageData((current) =>
        current
          ? { ...current, unread_count: result.unread_count }
          : { data: [], page: 1, page_size: 10, total: 0, total_pages: 0, unread_count: result.unread_count }
      );
      setState((current) => (current === "loading" && mode === "bell" ? "ready" : current));
    } catch (error) {
      setState(stateFrom(error));
    }
  }, [mode]);

  const load = useCallback(
    async (nextPage = page, nextStatus = status) => {
      setState("loading");
      try {
        const [items, prefs] = await Promise.all([
          requestJSON<Page>(
            `/api/bff/notifications?page=${nextPage}&page_size=10&status=${nextStatus}`
          ),
          requestJSON<{ data: Preference[] }>("/api/bff/notifications/preferences"),
        ]);
        setPageData(items);
        setPreferences(prefs.data);
        setState(items.data.length ? "ready" : "empty");
      } catch (error) {
        setState(stateFrom(error));
      }
    },
    [page, status]
  );

  // Real-Time Server-Sent Events (SSE) stream listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    let es: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const setupStream = () => {
      try {
        es = new EventSource("/api/bff/notifications/stream");

        es.addEventListener("connected", () => {
          setConnected(true);
        });

        es.addEventListener("summary", (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (typeof payload.unread_count === "number") {
              setPageData((current) =>
                current
                  ? { ...current, unread_count: payload.unread_count }
                  : { data: [], page: 1, page_size: 10, total: 0, total_pages: 0, unread_count: payload.unread_count }
              );
            }
          } catch {}
        });

        es.addEventListener("editorial", (event) => {
          try {
            const data = JSON.parse(event.data);

            // Add real-time toast alert
            const toastId = "toast-" + Date.now();
            setToasts((prev) => [
              ...prev,
              {
                id: toastId,
                title: data.title || "Konten Editorial",
                body:
                  data.reviewer_notes ||
                  `Status konten diperbarui menjadi ${data.action_label || data.action}.`,
                module_label: data.module_label,
                action_label: data.action_label,
                action: data.action,
                deep_link: data.deep_link || "/dashboard/review-queue",
              },
            ]);

            // Auto dismiss toast after 6 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 6000);

            // Synthesize notification item into live list
            const newItem: NotificationItem = {
              id: (data.id || "edit") + "-" + Date.now(),
              event_type: "content.workflow",
              title: `[${data.action_label || "Pembaruan"}] ${data.title}`,
              body:
                data.reviewer_notes ||
                `Perubahan status pada modul ${data.module_label || "Editorial"}.`,
              deep_link: data.deep_link || "/dashboard/review-queue",
              priority: data.action === "approved" ? "normal" : "high",
              created_at: data.timestamp || new Date().toISOString(),
            };

            setPageData((current) => {
              if (!current) return current;
              return {
                ...current,
                unread_count: current.unread_count + 1,
                data: [newItem, ...current.data.slice(0, current.page_size - 1)],
                total: current.total + 1,
              };
            });
            setState("ready");
          } catch {}
        });

        es.onerror = () => {
          setConnected(false);
          if (es) {
            es.close();
            es = null;
          }
          reconnectTimer = setTimeout(setupStream, 5000);
        };
      } catch {
        setConnected(false);
      }
    };

    setupStream();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) es.close();
    };
  }, []);

  // Quiet fallback poll every 5 minutes (plus visibility change)
  useEffect(() => {
    const initial = window.setTimeout(() => void loadSummary(), 0);
    const timer = window.setInterval(() => void loadSummary(), 300000);
    const visible = () => {
      if (document.visibilityState === "visible") void loadSummary();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [loadSummary]);

  useEffect(() => {
    if (!open) return;
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [open, load]);

  useEffect(() => {
    if (mode !== "bell" || !open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [mode, open]);

  const refresh = async (action: () => Promise<unknown>, key: string) => {
    setBusy(key);
    try {
      await action();
      await load(page, status);
      await loadSummary();
      return true;
    } catch (error) {
      setState(stateFrom(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const markRead = (item: NotificationItem) =>
    item.read_at
      ? Promise.resolve(true)
      : refresh(() => requestJSON(`/api/bff/notifications/${item.id}/read`, { method: "PATCH" }), item.id);

  const markAll = () =>
    refresh(() => requestJSON("/api/bff/notifications/read-all", { method: "POST" }), "all");

  const setPreference = (item: Preference) =>
    refresh(
      () =>
        requestJSON(`/api/bff/notifications/preferences/${item.event_type}`, {
          method: "PUT",
          body: JSON.stringify({ enabled: !item.enabled }),
        }),
      item.event_type
    );

  const unread = pageData?.unread_count || 0;

  const content = (
    <>
      <div className="notification-toolbar">
        <div>
          <div className="flex items-center gap-2">
            <p className="admin-kicker">Pusat Notifikasi</p>
            {connected && (
              <span className="cuba-live-chip" title="Koneksi SSE Real-time Aktif">
                <span className="cuba-live-dot" /> Real-time
              </span>
            )}
          </div>
          <h2 className="font-black text-slate-900 dark:text-white">Notifikasi Anda</h2>
        </div>
        {unread > 0 && (
          <button
            type="button"
            className="admin-button-secondary !min-h-9 !px-3"
            disabled={busy === "all"}
            onClick={() => void markAll()}
          >
            Tandai semua sudah dibaca
          </button>
        )}
      </div>

      {mode === "page" && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 p-4">
          <button
            type="button"
            className={status === "all" ? "admin-button" : "admin-button-secondary"}
            onClick={() => {
              setPage(1);
              setStatus("all");
            }}
          >
            Semua
          </button>
          <button
            type="button"
            className={status === "unread" ? "admin-button" : "admin-button-secondary"}
            onClick={() => {
              setPage(1);
              setStatus("unread");
            }}
          >
            Belum dibaca{unread ? ` (${unread > 99 ? "99+" : unread})` : ""}
          </button>
        </div>
      )}

      <div className="notification-list" aria-live="polite" aria-busy={state === "loading"}>
        {state === "loading" && <div className="admin-empty">Memuat notifikasi…</div>}
        {state === "empty" && (
          <div className="admin-empty">
            <AdminIcon name="bell" className="mx-auto mb-3 h-7 w-7 text-slate-400" />
            <p className="font-bold text-slate-800 dark:text-slate-200">Belum ada notifikasi.</p>
            <p className="mt-1 text-xs text-slate-500">Pembaruan yang relevan akan muncul di sini secara real-time.</p>
          </div>
        )}
        {state === "unauthorized" && (
          <div className="admin-alert-error" role="alert">
            Sesi Anda berakhir atau akses tidak tersedia. Silakan masuk kembali.
          </div>
        )}
        {state === "degraded" && (
          <div className="admin-alert-error" role="alert">
            Pusat notifikasi sedang mengalami gangguan. Data lain tetap dapat digunakan.
          </div>
        )}
        {state === "error" && (
          <div className="admin-alert-error" role="alert">
            Notifikasi gagal dimuat.{" "}
            <button type="button" className="font-black underline" onClick={() => void load()}>
              Coba lagi
            </button>
          </div>
        )}
        {state === "ready" &&
          pageData?.data.map((item) => (
            <article
              key={item.id}
              className={`notification-item ${item.read_at ? "is-read" : "is-unread"}`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                disabled={busy === item.id}
                onClick={() => void markRead(item)}
              >
                <span className="flex items-center gap-2">
                  <span className="notification-event">
                    {eventLabels[item.event_type] || "Notifikasi"}
                  </span>
                  {!item.read_at && (
                    <span className="notification-unread-dot" aria-label="Belum dibaca" />
                  )}
                </span>
                <strong className="mt-2 block text-sm text-slate-900 dark:text-white">
                  {item.title}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {item.body}
                </span>
                <time
                  className="mt-2 block text-[11px] text-slate-500 dark:text-slate-400"
                  dateTime={item.created_at}
                >
                  {formatTime(item.created_at)}
                </time>
              </button>
              <button
                type="button"
                className="admin-accent-control rounded-lg border px-3 py-2 text-xs font-black"
                disabled={busy === item.id}
                onClick={async () => {
                  if (await markRead(item)) router.push(safeAdminLink(item.deep_link));
                }}
              >
                Buka
              </button>
            </article>
          ))}
      </div>

      {mode === "page" && pageData && (
        <AdminClientPagination
          page={pageData.page}
          pages={pageData.total_pages}
          total={pageData.total}
          pageSize={pageData.page_size}
          onPageChange={setPage}
        />
      )}

      {mode === "page" && (
        <details className="notification-preferences">
          <summary>Pengaturan notifikasi</summary>
          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            {preferences.map((item) => (
              <label key={item.event_type} className="notification-preference">
                <span>
                  <strong>{eventLabels[item.event_type] || item.event_type}</strong>
                  <small>Notifikasi dalam aplikasi</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={item.enabled}
                  disabled={busy === item.event_type}
                  onChange={() => void setPreference(item)}
                  aria-label={`Aktifkan ${eventLabels[item.event_type] || item.event_type}`}
                />
              </label>
            ))}
          </div>
        </details>
      )}

      {mode === "bell" && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-3">
          <Link
            href="/dashboard/notifications"
            className="admin-button-secondary w-full text-center"
            onClick={() => setOpen(false)}
          >
            Buka Pusat Notifikasi
          </Link>
        </div>
      )}
    </>
  );

  const toastOverlay =
    toasts.length > 0 ? (
      <div className="cuba-toast-container" aria-live="assertive">
        {toasts.map((toast) => (
          <div key={toast.id} className="cuba-toast" role="alert">
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  toast.action === "approved"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : toast.action === "draft"
                      ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                      : "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
                }`}
              >
                <AdminIcon
                  name={
                    toast.action === "approved"
                      ? "check"
                      : toast.action === "draft"
                        ? "x"
                        : "announcement"
                  }
                  className="h-4 w-4"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {toast.module_label && (
                    <span className="cuba-badge cuba-badge-neutral !py-0 !text-[10px]">
                      {toast.module_label}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400">Baru saja</span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {toast.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {toast.body}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  {toast.deep_link && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-700"
                      onClick={() => {
                        router.push(safeAdminLink(toast.deep_link!));
                        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                      }}
                    >
                      <span>Buka</span>
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : null;

  if (mode === "page") {
    return (
      <>
        <section
          className="admin-card overflow-hidden"
          aria-labelledby="notification-page-title"
        >
          <h1 id="notification-page-title" className="sr-only">
            Pusat Notifikasi
          </h1>
          {content}
        </section>
        {toastOverlay}
      </>
    );
  }

  return (
    <>
      <div ref={root} className="relative">
        <button
          ref={button}
          type="button"
          className="admin-icon-button relative grid"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          aria-expanded={open}
          aria-controls="admin-notification-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <AdminIcon name="bell" className="h-5 w-5" />
          {unread > 0 && (
            <span className="notification-count" aria-hidden="true">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        {open && (
          <div
            id="admin-notification-panel"
            className="notification-popover"
            role="dialog"
            aria-label="Notifikasi"
          >
            {content}
          </div>
        )}
      </div>
      {toastOverlay}
    </>
  );
}
