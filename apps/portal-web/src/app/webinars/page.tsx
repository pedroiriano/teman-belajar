import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/techwind";
import { listPublicWebinars } from "@/lib/webinars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webinar & Sesi Belajar Langsung — Teman Belajar",
  description:
    "Ikuti sesi tatap muka daring interaktif bersama narasumber praktisi industri di platform Teman Belajar.",
};

function getPlatformBadge(provider: string) {
  const p = (provider || "").toLowerCase();
  if (p.includes("zoom")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
        Zoom
      </span>
    );
  }
  if (p.includes("meet") || p.includes("gmeet")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900">
        Google Meet
      </span>
    );
  }
  if (p.includes("team")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900">
        Teams
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      Online
    </span>
  );
}

export default async function WebinarsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const status = resolvedParams.status || "all";
  const query = resolvedParams.q || "";

  const response = await listPublicWebinars({
    page,
    pageSize: 12,
    status,
    query,
  });

  const webinars = response.data;
  const totalPages = response.total_pages;

  const tabs = [
    { key: "all", label: "Semua Sesi" },
    { key: "upcoming", label: "Akan Datang" },
    { key: "live", label: "Sedang Berlangsung" },
    { key: "completed", label: "Selesai & Rekaman" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <PageHero
        eyebrow="Pembelajaran Interaktif"
        title="Webinar & Sesi Belajar Langsung"
        description="Ruang belajar tatap muka daring bersama narasumber ahli. Dapatkan wawasan teknologi, studi kasus, dan tanya jawab langsung."
      />

      <section className="portal-container py-10 sm:py-12">
        {/* Controls & Filter Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = status === tab.key;
              const nextParams = new URLSearchParams();
              if (tab.key !== "all") nextParams.set("status", tab.key);
              if (query) nextParams.set("q", query);
              const href = `/webinars${nextParams.toString() ? `?${nextParams.toString()}` : ""}`;

              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/20"
                      : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search Input */}
          <form method="GET" action="/webinars" className="flex items-center gap-2 max-w-sm w-full">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <div className="relative w-full">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Cari topik atau narasumber…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Webinars Grid */}
        {webinars.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {webinars.map((item) => {
              const isLive = item.status === "live";
              const isCompleted = item.status === "completed";
              const isFull = item.registered_count >= item.capacity;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {/* Header: Platform & Status Badges */}
                    <div className="flex items-center justify-between gap-2">
                      {getPlatformBadge(item.source)}

                      <div>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            LIVE SEKARANG
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900">
                            Akan Datang
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="mt-3.5 flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                      <span>📅</span>
                      <span>
                        {new Date(item.starts_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(item.starts_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        WIB
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                      <Link href={`/webinars/${item.id}`}>{item.title}</Link>
                    </h3>

                    {/* Summary */}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Speaker */}
                    <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-xs font-bold">
                        {item.speaker ? item.speaker.charAt(0).toUpperCase() : "N"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.speaker}
                        </p>
                        <p className="text-[10px] text-slate-400">Narasumber</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Strip */}
                  <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500">
                        {item.registered ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <span>✓</span> Anda Terdaftar
                          </span>
                        ) : isFull ? (
                          <span className="font-semibold text-rose-500">Kuota Penuh</span>
                        ) : (
                          <span>
                            Sisa <strong className="text-slate-800 dark:text-slate-200">{Math.max(0, item.capacity - item.registered_count)}</strong> kursi
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/webinars/${item.id}`}
                        className="font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 transition"
                      >
                        {isLive ? "Masuk Sesi →" : "Detail Sesi →"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xl">
              📅
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">Tidak ada webinar yang ditemukan</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada sesi webinar pada kriteria filter ini. Silakan periksa tab kategori lain atau jadwalkan ulang pencarian Anda.
            </p>
            {(status !== "all" || query) && (
              <div className="mt-4">
                <Link href="/webinars" className="text-xs font-bold text-sky-600 hover:underline">
                  Tampilkan Semua Sesi
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const nextParams = new URLSearchParams();
              nextParams.set("page", String(p));
              if (status !== "all") nextParams.set("status", status);
              if (query) nextParams.set("q", query);

              return (
                <Link
                  key={p}
                  href={`/webinars?${nextParams.toString()}`}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                    p === page
                      ? "bg-sky-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
