"use client";

import { useState } from "react";
import { PortalIcon } from "@/components/portal-icon";
import { type CertificateVerificationResult, verifyCertificate } from "@/lib/certificates";

interface CertificateVerifyViewProps {
  initialCode?: string;
  initialResult?: CertificateVerificationResult | null;
}

const SAMPLE_CODES = ["TB-2026-X8K9L", "TB-TEST-1234"];

export function CertificateVerifyView({
  initialCode = "",
  initialResult = null,
}: CertificateVerifyViewProps) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<CertificateVerificationResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleVerify = async (queryCode?: string) => {
    const targetCode = (queryCode !== undefined ? queryCode : code).trim();

    if (!targetCode) {
      setValidationError("Silakan masukkan kode sertifikat terlebih dahulu.");
      return;
    }

    if (targetCode.length > 64) {
      setValidationError("Kode sertifikat maksimal 64 karakter.");
      return;
    }

    setValidationError(null);
    setLoading(true);

    // Sync URL without full reload for shareability
    if (typeof window !== "undefined") {
      const newUrl = `${window.location.pathname}?code=${encodeURIComponent(targetCode)}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
    }

    try {
      const res = await verifyCertificate(targetCode);
      setResult(res);
    } catch {
      setResult({
        valid: false,
        message: "Gagal terhubung ke layanan verifikasi. Silakan coba sesaat lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const cleaned = text.trim();
          setCode(cleaned);
          setValidationError(null);
          handleVerify(cleaned);
        }
      }
    } catch {
      // Clipboard permission denied, ignore gracefully
    }
  };

  const handleCopyLink = async () => {
    const urlToCopy =
      result?.certificate?.verification_url ||
      (typeof window !== "undefined" ? window.location.href : "");
    if (!urlToCopy) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = urlToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback or ignore
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Tanggal tidak tercatat";
    return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Search Bar Form Card */}
      <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <label htmlFor="cert-code-input" className="block text-sm font-bold text-slate-900 dark:text-white">
            Masukkan Kode Unik Sertifikat
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <PortalIcon name="shield" className="h-5 w-5" />
              </div>
              <input
                id="cert-code-input"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Contoh: TB-2026-X8K9L"
                maxLength={64}
                className="w-full pl-10 pr-20 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-primary hover:text-primary-700 transition-colors"
                title="Tempel dari Clipboard"
              >
                Tempel
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-700 text-white font-bold text-sm shadow-sm hover:shadow-md disabled:opacity-60 transition-all shrink-0"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <PortalIcon name="search" className="h-4 w-4" />
                  <span>Verifikasi Keaslian</span>
                </>
              )}
            </button>
          </div>

          {validationError && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <PortalIcon name="close" className="h-3.5 w-3.5" />
              <span>{validationError}</span>
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Coba kode contoh:</span>
            {SAMPLE_CODES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setCode(sample);
                  setValidationError(null);
                  handleVerify(sample);
                }}
                className="font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md transition-colors text-[11px]"
              >
                {sample}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      )}

      {/* Verification Result: Valid Certificate */}
      {!loading && result?.valid && result.certificate && (
        <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md overflow-hidden relative print:border print:shadow-none">
          {/* Top Verified Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <PortalIcon name="check" className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide uppercase">
                  Sertifikat Sah & Terverifikasi Resmi
                </h3>
                <p className="text-xs text-emerald-100">
                  Diverifikasi secara langsung oleh sistem resmi Teman Belajar
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-white/15 px-3 py-1 rounded-full border border-white/20">
              {result.certificate.code}
            </span>
          </div>

          {/* Certificate Body */}
          <div className="p-6 md:p-10 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {result.certificate.certificate_name || "Sertifikat Kelulusan"}
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                {result.certificate.recipient_name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Telah berhasil menyelesaikan seluruh kurikulum dan persyaratan evaluasi kompetensi pada program pembelajaran:
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                  {result.certificate.course_name}
                </h3>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Penerbit Resmi
                </span>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 block">
                  {result.certificate.issuer || "Teman Belajar LXP"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Tanggal Terbit
                </span>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 block">
                  {formatDate(result.certificate.issued_at)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 sm:col-span-2 md:col-span-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Status Keabsahan
                </span>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-1">
                  <PortalIcon name="check" className="h-4 w-4 shrink-0" />
                  <span>Aktif & Otentik</span>
                </div>
              </div>
            </div>

            {/* Actions Bar (hidden when printing) */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span>URL Verifikasi Permanen: </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 break-all">
                  {result.certificate.verification_url}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                >
                  <PortalIcon name="bookmark" className="h-4 w-4 text-primary" />
                  <span>{copied ? "Tautan Tersalin!" : "Salin Tautan Bukti"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  <PortalIcon name="document" className="h-4 w-4" />
                  <span>Cetak Bukti Verifikasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result: Invalid / Not Found */}
      {!loading && result && !result.valid && (
        <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border-2 border-red-500/20 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <PortalIcon name="close" className="h-6 w-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Sertifikat Tidak Ditemukan
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {result.message || "Sertifikat dengan kode tersebut tidak ditemukan atau tidak valid."}
              </p>
              <div className="pt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Tips verifikasi:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pastikan penulisan kode huruf besar dan tanda hubung sudah benar (contoh: <code className="font-mono text-primary">TB-2026-X8K9L</code>).</li>
                  <li>Jika Anda memindai QR code dari dokumen fisik, pastikan seluruh tautan mengarah ke domain resmi Teman Belajar.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idle Explanatory Section (shown if no search has run yet or to provide helpful context) */}
      {!loading && !result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 print:hidden">
          <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-primary flex items-center justify-center">
              <PortalIcon name="shield" className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              1. Kode Unik & Kredibel
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Setiap sertifikat kelulusan yang diterbitkan memiliki kode hash alfanumerik unik yang teregistrasi di basis data kami.
            </p>
          </div>

          <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <PortalIcon name="check" className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              2. Validasi Instan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pemberi kerja atau institusi dapat memvalidasi identitas penerima dan keabsahan pelatihan tanpa perlu login akun.
            </p>
          </div>

          <div className="portal-card bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <PortalIcon name="document" className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              3. Perlindungan Pemalsuan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mencegah duplikasi dokumen dan manipulasi nama penerima dengan data sumber resmi dari Learning Experience Platform.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
