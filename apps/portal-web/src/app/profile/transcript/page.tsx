import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { getBackendAccessToken } from "@/lib/server-auth";
import { getLearnerTranscript } from "@/lib/transcript";
import { TranscriptActions } from "@/components/learning/transcript-actions";
import { PortalIcon } from "@/components/portal-icon";

export const metadata: Metadata = {
  title: "Transkrip Pembelajaran & Kompetensi Resmi",
  description: "Transkrip akademik dan rekapitulasi capaian kompetensi resmi pembelajar di Teman Belajar.",
  alternates: { canonical: "/profile/transcript" },
};

function formatDate(timestamp?: number) {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function LearnerTranscriptPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/profile/transcript");
  }

  const token = await getBackendAccessToken();
  const transcript = token ? await getLearnerTranscript(token) : null;

  if (!transcript) {
    return (
      <div className="portal-container py-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <PortalIcon name="document" className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Transkrip Belum Tersedia
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Data transkrip pembelajaran belum dapat dimuat atau akun Anda belum terhubung dengan aktivitas kursus di sistem LMS. Silakan ikuti kursus dan selesaikan materi terlebih dahulu.
          </p>
          <div className="pt-2">
            <Link
              href="/profile?tab=portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <PortalIcon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
              <span>Kembali ke Profil</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { document_number, issued_at, learner, summary, courses } = transcript;
  const issueDateFormatted = formatDate(issued_at);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 print:py-0 print:bg-white text-slate-900 dark:text-slate-100">
      {/* Print Specific CSS Override */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .portal-header, .portal-footer {
              display: none !important;
            }
          }
        `,
      }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 print:px-0 print:max-w-full">
        {/* Action Header: Back, Print & Copy (Hidden on Print) */}
        <TranscriptActions documentNumber={document_number} />

        {/* The Official Document Paper */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-12 shadow-md print:shadow-none print:border-0 print:p-4 print:bg-white print:text-black">
          {/* Institutional Kop Surat Header */}
          <div className="border-b-2 border-slate-900 dark:border-white print:border-black pb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white font-black text-2xl shadow-sm print:bg-teal-700">
                  TB
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white print:text-black uppercase">
                    Teman Belajar
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600 tracking-wider uppercase">
                    Platform Pengalaman Belajar Digital Perusahaan (LXP)
                  </p>
                  <p className="text-[11px] text-slate-400 print:text-slate-500">
                    Sistem Manajemen Pembelajaran Terintegrasi Moodle LMS
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 print:border-teal-600 print:bg-transparent print:text-teal-800">
                  <PortalIcon name="shield" className="h-3.5 w-3.5" />
                  <span>Dokumen Sah & Tervalidasi</span>
                </div>
                <div className="mt-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">
                  No: {document_number}
                </div>
                <div className="text-[11px] text-slate-500 print:text-slate-600">
                  Tanggal Terbit: {issueDateFormatted}
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-lg md:text-xl font-black tracking-wider uppercase text-slate-900 dark:text-white print:text-black">
                Transkrip Pembelajaran & Portofolio Kompetensi Resmi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                Rekapitulasi Capaian Akademik, Jam Pelatihan, dan Sertifikasi Kelulusan
              </p>
            </div>
          </div>

          {/* Learner Data Section */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 print:bg-slate-50 print:border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                  Nama Lengkap Pembelajar
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white print:text-black">
                  {learner.name}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                  ID Pengguna / Username
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-slate-800">
                  {learner.username}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                  Alamat Surel Terdaftar
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-slate-800">
                  {learner.email}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                  Status Akun & Verifikasi
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400 print:text-teal-800">
                  <PortalIcon name="check" className="h-3 w-3" />
                  <span>Keycloak OIDC Single Sign-On</span>
                </span>
              </div>
            </div>
          </div>

          {/* Academic Table */}
          <div className="mt-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-slate-800 mb-3 flex items-center justify-between">
              <span>Daftar Pelatihan & Riwayat Capaian</span>
              <span className="text-[11px] font-normal text-slate-500 print:text-slate-500">
                Total: {courses.length} Kursus
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700 print:border-slate-300 bg-slate-100/70 dark:bg-slate-800/60 print:bg-slate-100 text-slate-700 dark:text-slate-300 print:text-slate-800">
                    <th className="py-2.5 px-3 font-bold w-8 text-center">No</th>
                    <th className="py-2.5 px-3 font-bold">Kode</th>
                    <th className="py-2.5 px-3 font-bold">Nama Kursus / Pelatihan</th>
                    <th className="py-2.5 px-3 font-bold">Kategori</th>
                    <th className="py-2.5 px-3 font-bold text-center">Progres</th>
                    <th className="py-2.5 px-3 font-bold text-center">Nilai Akhir</th>
                    <th className="py-2.5 px-3 font-bold">Kode Sertifikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                  {courses.length > 0 ? (
                    courses.map((c, idx) => (
                      <tr key={c.course_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 print:hover:bg-transparent">
                        <td className="py-3 px-3 text-center text-slate-400 print:text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 print:text-slate-800 text-[11px]">
                          {c.short_name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white print:text-black">
                            {c.course_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 print:text-slate-700">
                          {c.category || "Umum"}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {c.completed ? (
                            <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 print:text-teal-700">
                              <PortalIcon name="check" className="h-3 w-3" />
                              <span>100% (Lulus)</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 print:text-amber-700">
                              {Math.round(c.progress)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-800 dark:text-slate-200 print:text-slate-800">
                          {c.final_grade && c.final_grade !== "-" ? c.final_grade : "-"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {c.certificate_code ? (
                            <Link
                              href={`/certificates/verify?code=${encodeURIComponent(c.certificate_code)}`}
                              target="_blank"
                              className="font-bold text-teal-600 dark:text-teal-400 hover:underline print:text-black print:no-underline"
                            >
                              {c.certificate_code}
                            </Link>
                          ) : (
                            <span className="text-slate-400 print:text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada data kursus yang diselesaikan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cumulative Metrics Box */}
          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 pt-6">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-slate-800 mb-3">
              Ringkasan Capaian Kumulatif
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50 print:border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600">
                  Total Kursus Lulus
                </span>
                <span className="block text-xl font-black text-slate-900 dark:text-white print:text-black mt-0.5">
                  {summary.completed_courses} / {summary.total_courses}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50 print:border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600">
                  Akumulasi Jam Belajar
                </span>
                <span className="block text-xl font-black text-slate-900 dark:text-white print:text-black mt-0.5">
                  {summary.total_learning_hours} Jam
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50 print:border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600">
                  Rata-rata Skor Kelulusan
                </span>
                <span className="block text-xl font-black text-slate-900 dark:text-white print:text-black mt-0.5">
                  {summary.average_score > 0 ? summary.average_score.toFixed(1) : "-"}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50 print:border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 print:text-slate-600">
                  Sertifikat Resmi Diraih
                </span>
                <span className="block text-xl font-black text-teal-600 dark:text-teal-400 print:text-teal-700 mt-0.5">
                  {summary.total_certificates} Dokumen
                </span>
              </div>
            </div>
          </div>

          {/* Validation Footnote & Digital Signature Stamp */}
          <div className="mt-10 pt-6 border-t-2 border-dashed border-slate-200 dark:border-slate-800 print:border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-6 items-end">
            <div className="sm:col-span-8 text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-300 print:text-slate-800">
                Catatan Keabsahan Transkrip Elektronik:
              </p>
              <p className="leading-relaxed text-[11px]">
                Dokumen transkrip ini diterbitkan secara elektronik oleh platform <strong>Teman Belajar LXP</strong> dan terintegrasi secara otomatis dengan <strong>Moodle LMS</strong>. Keabsahan sertifikat dan kelulusan dapat diverifikasi mandiri oleh publik melalui tautan resmi:
              </p>
              <p className="font-mono text-[11px] text-teal-600 dark:text-teal-400 print:text-black font-semibold">
                http://localhost:3100/certificates/verify
              </p>
            </div>

            <div className="sm:col-span-4 text-center sm:text-right space-y-2">
              <div className="inline-block border border-teal-500/40 rounded-xl p-3 bg-teal-50/40 dark:bg-teal-950/20 print:bg-white print:border-teal-700 text-center w-full max-w-[220px]">
                <div className="h-8 flex items-center justify-center text-teal-700 dark:text-teal-300 font-extrabold text-[11px] tracking-wider uppercase">
                  Tervalidasi Digital
                </div>
                <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 print:text-black border-t border-teal-500/30 pt-1">
                  Sistem Autentikasi LXP
                </div>
                <div className="text-[9px] text-slate-400 print:text-slate-500">
                  Teman Belajar Platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
