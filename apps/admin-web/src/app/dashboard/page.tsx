import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { AdminIcon, type AdminIconName } from "@/components/admin-icon";
import { authOptions } from "@/lib/auth";
import { getDashboardSummaryAction } from "@/app/actions/dashboard";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardReviewQueue } from "@/components/dashboard/dashboard-review-queue";

export const dynamic = "force-dynamic";

interface ModuleQuickLink {
  href: string;
  title: string;
  copy: string;
  icon: AdminIconName;
  label: string;
}

const modules: ModuleQuickLink[] = [
  { href: "/dashboard/knowledge", title: "Pusat Pengetahuan", copy: "Kelola artikel, revisi, dan proses peninjauan.", icon: "knowledge", label: "Pengetahuan" },
  { href: "/dashboard/news", title: "Berita", copy: "Susun kabar dan cerita pembelajaran organisasi.", icon: "news", label: "CMS" },
  { href: "/dashboard/announcements", title: "Pengumuman", copy: "Atur informasi aktif dan terjadwal.", icon: "announcement", label: "Jadwal" },
  { href: "/dashboard/media", title: "Pustaka Media", copy: "Kelola gambar dan dokumen yang aman.", icon: "media", label: "Aset" },
  { href: "/dashboard/training-programs", title: "Program Pelatihan", copy: "Kelola kurikulum kursus dan cohort peserta.", icon: "folder", label: "Pelatihan" },
  { href: "/dashboard/microlearning", title: "Pembelajaran Singkat", copy: "Susun modul kartu baca ringkas dan video.", icon: "file", label: "Belajar" },
  { href: "/dashboard/learning-paths", title: "Jalur Belajar", copy: "Rancang tahapan kompetensi berjenjang terpadu.", icon: "dashboard", label: "Kurikulum" },
];

const workflow = [
  ["1", "Draf", "Editor"],
  ["2", "Dalam peninjauan", "Editor"],
  ["3", "Disetujui", "Peninjau"],
  ["4", "Terbit", "Peninjau"],
  ["5", "Arsip", "Editorial"],
];

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const roles = (session as typeof session & { roles?: string[] }).roles || [];
  const hasAccess = roles.some((role) =>
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(role)
  );

  if (!hasAccess) {
    return (
      <div className="admin-card mx-auto max-w-xl border-rose-200 p-8 text-center" role="alert">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 font-black text-rose-700">
          403
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Akses tidak tersedia</h1>
        <p className="mt-3 text-slate-600">Akun ini belum memiliki role editorial yang diperlukan.</p>
        <Link href="/api/auth/federated-logout" prefetch={false} className="admin-button mt-6">
          Keluar dan masuk kembali
        </Link>
      </div>
    );
  }

  const canCreate = roles.some((role) =>
    ["Portal Administrator", "Content Editor"].includes(role)
  );

  const name = session.user?.name?.split(" ")[0] || "Tim";

  // Fetch real aggregate summary data from backend Go via Server Action
  const summaryResult = await getDashboardSummaryAction();
  const summary = summaryResult.success ? summaryResult.data : null;

  const kpi = summary?.kpi || {
    total_published: 0,
    total_draft: 0,
    pending_review: 0,
    active_programs: 0,
  };

  const breakdown = summary?.content_breakdown || {
    knowledge: { published: 0, draft: 0, in_review: 0 },
    news: { published: 0, draft: 0, in_review: 0 },
    announcements: { published: 0, draft: 0, in_review: 0 },
    faqs: { published: 0, draft: 0, in_review: 0 },
    microlearning: { published: 0, draft: 0, in_review: 0 },
    training: { published: 0, draft: 0, in_review: 0 },
    learning_paths: { published: 0, draft: 0, in_review: 0 },
  };

  const reviewQueue = summary?.review_queue || [];

  return (
    <div className="admin-page cuba-course-dashboard space-y-7" data-cuba-pattern="online-course-dashboard">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Dasbor editorial</p>
          <h1 className="admin-page-title">Selamat datang, {name}</h1>
          <p className="admin-page-copy">Pantau metrik operasional dan antrean peninjauan konten Anda.</p>
        </div>
        <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
          Alur kerja aktif
        </div>
      </div>

      {/* Banner & Welcome Section */}
      <section className="cuba-course-banner" aria-labelledby="welcome-title">
        <div className="cuba-course-banner-orb" aria-hidden="true" />
        <div className="relative max-w-xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-sky-100">
            Admin Teman Belajar
          </p>
          <h2 id="welcome-title" className="mt-4 text-3xl font-black sm:text-4xl">
            Kelola konten dengan alur yang jelas.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-sky-50">
            Mulai dari draf, tinjau bersama, lalu terbitkan pengalaman belajar yang berkualitas bagi seluruh ASN.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {canCreate && (
              <Link href="/dashboard/knowledge/create" className="cuba-course-banner-action">
                Buat artikel baru <AdminIcon name="arrow" className="ml-2 h-4 w-4" />
              </Link>
            )}
            <a href="#review-queue" className="cuba-course-banner-action">
              Tinjau antrean ({kpi.pending_review}) <AdminIcon name="arrow" className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="cuba-course-banner-visual" aria-hidden="true">
          <AdminIcon name="knowledge" className="h-12 w-12" />
          <span />
        </div>
      </section>

      {/* 4 KPI Cards Cuba */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan operasional">
        {/* Card 1: Menunggu Tinjauan */}
        <article className="cuba-kpi-card border-l-4 border-l-yellow-500 p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300">
              <AdminIcon name="clock" className="h-5 w-5" />
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpi.pending_review}</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Menunggu Tinjauan</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400 font-medium">
            <AdminIcon name="clock" className="h-3.5 w-3.5 shrink-0" /> Prioritas keputusan editorial
          </p>
        </article>

        {/* Card 2: Draf Aktif */}
        <article className="cuba-kpi-card border-l-4 border-l-sky-500 p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
              <AdminIcon name="book" className="h-5 w-5" />
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpi.total_draft}</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Draf Aktif</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-400 font-medium">
            <AdminIcon name="edit" className="h-3.5 w-3.5 shrink-0" /> Konten dalam tahap penulisan
          </p>
        </article>

        {/* Card 3: Konten Terbit */}
        <article className="cuba-kpi-card border-l-4 border-l-emerald-500 p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <AdminIcon name="check" className="h-5 w-5" />
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpi.total_published}</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Konten Terbit</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <AdminIcon name="eye" className="h-3.5 w-3.5 shrink-0" /> Tersedia untuk pembelajar
          </p>
        </article>

        {/* Card 4: Program Pelatihan Aktif */}
        <article className="cuba-kpi-card border-l-4 border-l-blue-600 p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              <AdminIcon name="calendar" className="h-5 w-5" />
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{kpi.active_programs}</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Program Aktif</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium">
            <AdminIcon name="refresh" className="h-3.5 w-3.5 shrink-0" /> Cohort terjadwal dan berjalan
          </p>
        </article>
      </section>

      {/* Visualisasi ApexCharts Cuba */}
      <DashboardCharts kpi={kpi} breakdown={breakdown} />

      {/* Antrean Peninjauan Lintas Modul */}
      <div id="review-queue">
        <DashboardReviewQueue items={reviewQueue} />
      </div>

      {/* Akses Cepat Modul Editorial */}
      <section className="cuba-course-catalog" aria-labelledby="modules-title">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Akses cepat</p>
            <h2 id="modules-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              Modul Editorial & Pembelajaran
            </h2>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="admin-card cuba-course-module group p-5 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between">
                <span className="admin-stat-icon">
                  <AdminIcon name={module.icon} className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {module.label}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-black text-slate-900 dark:text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{module.copy}</p>
              <span className="mt-5 inline-flex items-center text-sm font-bold text-sky-700 dark:text-sky-400">
                Buka modul <AdminIcon name="arrow" className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Alur Kerja Publikasi Terkontrol */}
      <section className="admin-card cuba-course-schedule overflow-hidden" aria-labelledby="workflow-title">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Alur kerja editorial</p>
            <h2 id="workflow-title" className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              Alur publikasi terkontrol
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Berlaku untuk seluruh modul konten</span>
        </div>
        <ol className="grid gap-0 p-5 md:grid-cols-5">
          {workflow.map(([number, status, owner], index) => (
            <li
              key={status}
              className="relative border-b border-slate-100 p-4 last:border-0 dark:border-slate-800 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {number}
                </span>
                <span className="text-xs font-bold text-slate-400">{owner}</span>
              </div>
              <p className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-200">{status}</p>
              {index < workflow.length - 1 && (
                <AdminIcon
                  name="arrow"
                  className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 rounded-full bg-white text-slate-300 dark:bg-slate-800 dark:text-slate-600 md:block"
                />
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
