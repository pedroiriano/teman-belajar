"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AdminIcon } from "@/components/admin-icon";

export type ToastType = "success" | "info" | "warning" | "error";

export interface CubaToastItem {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ShowToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface CubaToastContextValue {
  showToast(options: ShowToastOptions): void;
  success(title: string, message?: string): void;
  info(title: string, message?: string): void;
  warning(title: string, message?: string): void;
  error(title: string, message?: string): void;
}

const ToastContext = createContext<CubaToastContextValue | null>(null);

export function CubaToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<CubaToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type = "info", duration = 3500 }: ShowToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newToast: CubaToastItem = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      showToast({ title, message, type: "success" });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({ title, message, type: "info" });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast({ title, message, type: "warning" });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({ title, message, type: "error" });
    },
    [showToast]
  );

  const contextValue = useMemo(
    () => ({ showToast, success, info, warning, error }),
    [showToast, success, info, warning, error]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div className="cuba-toast-container" aria-live="assertive">
          {toasts.map((toast) => {
            const iconName =
              toast.type === "success"
                ? "check"
                : toast.type === "warning"
                  ? "alert"
                  : toast.type === "error"
                    ? "x"
                    : "announcement";

            const iconClass =
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                : toast.type === "warning"
                  ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                  : toast.type === "error"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                    : "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300";

            return (
              <div
                key={toast.id}
                className="cuba-toast flex items-start gap-3 relative"
                role="alert"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
                >
                  <AdminIcon name={iconName} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {toast.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Tutup notifikasi"
                >
                  <AdminIcon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useCubaToast(): CubaToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider to avoid crash
    return {
      showToast: () => {},
      success: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    };
  }
  return context;
}
