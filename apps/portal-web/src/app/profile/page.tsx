import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { getBackendAccessToken } from "@/lib/server-auth";
import { PageHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";
import type { EnrolledCourse } from "@/lib/learning/types";

export const metadata: Metadata = {
  title: "Profil Pengguna",
  description: "Kelola profil pembelajar, progres kursus aktif, dan sertifikat kelulusan di Teman Belajar.",
  alternates: { canonical: "/profile" },
};

async function getLearnerProfileData(token: string) {
  const apiUrl = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiUrl) return { me: null, courses: [] };

  try {
    const [meRes, coursesRes] = await Promise.all([
      fetch(`${apiUrl}/api/v1/learning/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${apiUrl}/api/v1/learning/me/courses`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    const me = meRes.ok ? await meRes.json() : null;
    const courses = coursesRes.ok ? await coursesRes.json() : { data: [] };
    return { me, courses: Array.isArray(courses.data) ? courses.data : [] };
  } catch {
    return { me: null, courses: [] };
  }
}

export default async function LearnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/profile");
  }

  const raw = await searchParams;
  const activeTab = raw.tab || "active-learning";

  const accessToken = await getBackendAccessToken();
  const { me, courses } = accessToken ? await getLearnerProfileData(accessToken) : { me: null, courses: [] };

  const enrolledCourses: EnrolledCourse[] = courses;
  const completedCourses = enrolledCourses.filter((c) => (c.progress ?? 0) >= 100);
  const inProgressCourses = enrolledCourses.filter((c) => (c.progress ?? 0) < 100);

  const averageProgress = enrolledCourses.length > 0
    ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress ?? 0), 0) / enrolledCourses.length)
    : 0;

  const learnerName = session.user?.name || me?.full_name || "Peserta Pembelajaran";
  const learnerEmail = session.user?.email || me?.email || "-";
  const userInitials = learnerName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <PageHero
        eyebrow="Profil Peserta Pembelajaran"
        title={learnerName}
        description="Pantau progres capaian belajar Anda, unduh sertifikat kelulusan, dan kelola preferensi akun secara terpadu."
        icon="user"
        tone="teal"
      />

      <div className="portal-container mt-10 space-y-8">
        {/* Profile Card & KPI Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* User Information Card */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 font-black text-white text-xl shadow-md">
                {userInitials}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {learnerName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {learnerEmail}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Akun SSO Terverifikasi</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Pusat Notifikasi:</span>
                <Link href="/notifications" className="font-bold text-teal-600 dark:text-teal-400 hover:underline">
                  Buka Notifikasi
                </Link>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Katalog Lengkap:</span>
                <Link href="/catalog" className="font-bold text-teal-600 dark:text-teal-400 hover:underline">
                  Jelajahi Katalog
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Metrics Cards */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 mb-2">
                <PortalIcon name="book" className="h-5 w-5" />
              </div>
              <strong className="block text-2xl font-black text-slate-900 dark:text-white">
                {enrolledCourses.length}
              </strong>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Kursus
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 mb-2">
                <PortalIcon name="graduation" className="h-5 w-5" />
              </div>
              <strong className="block text-2xl font-black text-slate-900 dark:text-white">
                {inProgressCourses.length}
              </strong>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sedang Berjalan
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <strong className="block text-2xl font-black text-slate-900 dark:text-white">
                {completedCourses.length}
              </strong>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Telah Selesai
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 mb-2">
                <PortalIcon name="star" className="h-5 w-5" />
              </div>
              <strong className="block text-2xl font-black text-slate-900 dark:text-white">
                {averageProgress}%
              </strong>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Rata-rata Progres
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Link
            href="/profile?tab=active-learning"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "active-learning"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <PortalIcon name="book" className="h-4 w-4" />
            <span>Kursus Sedang Berjalan ({inProgressCourses.length})</span>
          </Link>
          <Link
            href="/profile?tab=completed"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "completed"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Riwayat & Kelulusan ({completedCourses.length})</span>
          </Link>
          <Link
            href="/profile?tab=account"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "account"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <PortalIcon name="user" className="h-4 w-4" />
            <span>Informasi Akun</span>
          </Link>
        </div>

        {/* Tab Content 1: Active Learning */}
        {activeTab === "active-learning" && (
          <div className="space-y-4">
            {inProgressCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressCourses.map((course) => {
                  const progressPct = Math.round(course.progress ?? 0);
                  return (
                    <div
                      key={course.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                            {course.short_name || "Kursus Formal"}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {progressPct}%
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                          {course.full_name}
                        </h3>
                        {/* Progress Bar */}
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Status: Sedang Berjalan
                        </span>
                        <Link
                          href="/my-learning"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
                        >
                          <span>Lanjutkan Belajar</span>
                          <PortalIcon name="chevron-right" className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-12 text-center">
                <PortalIcon name="book" className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Belum Ada Kursus Berjalan
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Anda belum memulai kursus pembelajaran aktif. Jelajahi katalog terpadu untuk mendaftar kelas baru.
                </p>
                <div className="mt-6">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    <span>Buka Katalog Pembelajaran</span>
                    <PortalIcon name="chevron-right" className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Completed Courses & Certificates */}
        {activeTab === "completed" && (
          <div className="space-y-4">
            {completedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-6 shadow-sm flex items-start gap-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Kelulusan Terverifikasi
                      </span>
                      <h3 className="mt-1 font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">
                        {course.full_name}
                      </h3>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Progres: 100% Selesai
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-12 text-center">
                <PortalIcon name="star" className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Belum Ada Sertifikat Kelulusan
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Selesaikan materi dan kuis pada kursus Anda untuk mendapatkan sertifikat kelulusan resmi.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Account & Session Info */}
        {activeTab === "account" && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Informasi Akun SSO & Keamanan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Akun Anda terhubung langsung dengan sistem autentikasi tunggal Keycloak SSO.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="block font-bold text-slate-400 mb-1 uppercase tracking-wider">Nama Lengkap</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{learnerName}</span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 mb-1 uppercase tracking-wider">Alamat Surel</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{learnerEmail}</span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 mb-1 uppercase tracking-wider">Metode Masuk</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Keycloak OpenID Connect</span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 mb-1 uppercase tracking-wider">Integrasi LMS</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Moodle Learning Gateway</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/notifications"
                className="inline-flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <PortalIcon name="bell" className="h-4 w-4" />
                <span>Pengaturan Notifikasi Editorial</span>
              </Link>
              <Link
                href="/api/auth/federated-logout"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
              >
                <span>Keluar dari Akun</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
