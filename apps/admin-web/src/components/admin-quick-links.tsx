"use client";

import { useCallback, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { useCubaToast } from "@/components/cuba-toast";

interface QuickLinkProps {
  path: string;
  title?: string;
  className?: string;
}

export function getPublicPortalUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NEXT_PUBLIC_PORTAL_WEB_URL) {
    return `${process.env.NEXT_PUBLIC_PORTAL_WEB_URL.replace(/\/$/, "")}${cleanPath}`;
  }
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes(":3001")) {
      return origin.replace(":3001", ":3000") + cleanPath;
    }
    if (origin.includes("admin.")) {
      return origin.replace("admin.", "web.") + cleanPath;
    }
  }
  return `http://localhost:3000${cleanPath}`;
}

export function AdminQuickLinkPreview({ path, title, className = "" }: QuickLinkProps) {
  const publicUrl = getPublicPortalUrl(path);

  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center h-7.5 w-7.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-600 hover:border-sky-300 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:border-sky-600 transition-colors bg-white dark:bg-slate-800 shadow-sm ${className}`}
      title={`Buka pratinjau publik ${title ? `"${title}"` : ""}`}
      aria-label={`Buka pratinjau publik ${title ? `"${title}"` : ""}`}
    >
      <AdminIcon name="external" className="h-3.5 w-3.5" />
    </a>
  );
}

export function AdminQuickLinkCopy({ path, title, className = "" }: QuickLinkProps) {
  const { success, error } = useCubaToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const publicUrl = getPublicPortalUrl(path);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        // Fallback for older environments
        const textArea = document.createElement("textarea");
        textArea.value = publicUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      success("Tautan Disalin", `Tautan publik untuk ${title ? `"${title}"` : "konten ini"} berhasil disalin.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error("Gagal Menyalin", "Tidak dapat menyalin tautan ke clipboard.");
    }
  }, [path, title, success, error]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center h-7.5 w-7.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-600 hover:border-sky-300 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:border-sky-600 transition-colors bg-white dark:bg-slate-800 shadow-sm ${className}`}
      title={copied ? "Tersalin!" : `Salin tautan publik ${title ? `"${title}"` : ""}`}
      aria-label={copied ? "Tersalin!" : `Salin tautan publik ${title ? `"${title}"` : ""}`}
    >
      <AdminIcon name={copied ? "check" : "file"} className={`h-3.5 w-3.5 ${copied ? "text-emerald-500" : ""}`} />
    </button>
  );
}

export function AdminQuickLinks({ path, title, className = "" }: QuickLinkProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <AdminQuickLinkPreview path={path} title={title} />
      <AdminQuickLinkCopy path={path} title={title} />
    </div>
  );
}
