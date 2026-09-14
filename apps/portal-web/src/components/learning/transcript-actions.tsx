"use client";

import { useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/portal-icon";

interface TranscriptActionsProps {
  documentNumber: string;
}

export function TranscriptActions({ documentNumber }: TranscriptActionsProps) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleCopyDocNumber = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(documentNumber);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = documentNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm print:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/profile?tab=portfolio"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <PortalIcon name="chevron-right" className="h-4 w-4 rotate-180" />
          <span>Kembali ke Portofolio</span>
        </Link>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          No. Registrasi: <span className="font-mono font-bold text-slate-900 dark:text-white">{documentNumber}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopyDocNumber}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
        >
          <PortalIcon name="bookmark" className="h-4 w-4 text-primary" />
          <span>{copied ? "Nomor Tersalin!" : "Salin No. Dokumen"}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-700 text-white shadow-sm hover:shadow transition-all"
        >
          <PortalIcon name="document" className="h-4 w-4" />
          <span>Cetak / Simpan PDF</span>
        </button>
      </div>
    </div>
  );
}
