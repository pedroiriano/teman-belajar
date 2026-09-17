import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPublicWebinarDetail } from "@/lib/webinars";
import { WebinarActions } from "@/components/webinars/webinar-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawID } = await params;
  const id = parseInt(rawID, 10);
  if (isNaN(id) || id < 1) return { title: "Webinar Tidak Ditemukan" };
  const webinar = await getPublicWebinarDetail(id);
  if (!webinar) return { title: "Webinar Tidak Ditemukan" };

  return {
    title: `${webinar.title} — Webinar Teman Belajar`,
    description: webinar.summary || "Sesi tatap muka daring interaktif bersama narasumber di Teman Belajar.",
  };
}

function getPlatformBadge(provider: string) {
  const p = (provider || "").toLowerCase();
  if (p.includes("zoom")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
        🎥 Zoom Meeting
      </span>
    );
  }
  if (p.includes("meet") || p.includes("gmeet")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900">
        📹 Google Meet
      </span>
    );
  }
  if (p.includes("team")) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900">
        👥 Microsoft Teams
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      🌐 Ruang Tatap Muka Online
    </span>
  );
}

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawID } = await params;
  const id = parseInt(rawID, 10);
  if (isNaN(id) || id < 1) notFound();

  const webinar = await getPublicWebinarDetail(id);
  if (!webinar) notFound();

  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session);

  const isLive = webinar.status === "live";
  const isCompleted = webinar.status === "completed";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 dark:bg-slate-950">
      {/* Breadcrumb Header */}
      <div className="border-b border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="portal-container flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/webinars" className="hover:text-slate-900 dark:hover:text-white">
            Webinar
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold dark:text-slate-200 truncate max-w-xs sm:max-w-md">
            {webinar.title}
          </span>
        </div>
      </div>

      <div className="portal-container mt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content (Left, 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Header Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {getPlatformBadge(webinar.source)}

                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    SEDANG BERLANGSUNG (LIVE)
                  </span>
                ) : isCompleted ? (
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Sesi Telah Selesai
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900">
                    Akan Datang
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                {webinar.title}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {webinar.summary}
              </p>

              {/* Schedule and Speaker Banner */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Waktu Sesi</p>
                  <p className="text-slate-900 dark:text-white font-bold text-sm mt-1">
                    {new Date(webinar.starts_at).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sky-600 dark:text-sky-400 font-bold mt-0.5">
                    {new Date(webinar.starts_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {new Date(webinar.ends_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </p>
                </div>

                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Narasumber</p>
                  <p className="text-slate-900 dark:text-white font-bold text-sm mt-1">{webinar.speaker}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">Pemateri Sesi Teman Belajar</p>
                </div>
              </div>
            </div>

            {/* Description Body */}
            {webinar.description && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tentang Sesi Ini</h2>
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                  {webinar.description}
                </div>
              </div>
            )}

            {/* Preparation Guidelines */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Panduan Mengikuti Sesi</h2>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">1.</span>
                  <span>Pastikan Anda telah mendaftar pada sesi ini sebelum kuota kursi penuh.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">2.</span>
                  <span>
                    Masuk ke ruang pertemuan 5–10 menit sebelum jadwal dimulai untuk memastikan koneksi dan audio berfungsi dengan baik.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">3.</span>
                  <span>
                    Tautan masuk ke ruang konferensi akan aktif di halaman ini tepat saat sesi dimulai.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 font-bold">4.</span>
                  <span>
                    Gunakan headset atau earphone untuk mendapatkan kualitas audio yang optimal selama sesi pemaparan dan diskusi tanya jawab.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sidebar Area (Right, 1 col) */}
          <div className="space-y-6">
            <div className="sticky top-6 space-y-6">
              {/* Interactive Actions Component */}
              <WebinarActions webinar={webinar} isLoggedIn={isLoggedIn} />

              {/* Fast Facts Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-xs space-y-3.5">
                <h4 className="font-bold text-slate-900 dark:text-white">Informasi Singkat</h4>
                <div className="flex justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <span className="text-slate-500">Format Sesi</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Tatap Muka Daring</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <span className="text-slate-500">Biaya Akses</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Gratis (Peserta Terdaftar)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <span className="text-slate-500">Bahasa</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Bahasa Indonesia</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rekaman Sesi</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {webinar.recording_url ? "Tersedia" : "Disediakan Pasca-Sesi"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
