import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBackendAccessToken } from "@/lib/server-auth";
import { CourseList } from "@/components/learning/course-list";
import { PortalIcon } from "@/components/portal-icon";
import type { EnrolledCourse } from "@/lib/learning/types";
import { EngagementDiscovery } from "@/components/engagement/engagement-discovery";

async function getLearningData(token: string) {
  const apiUrl = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiUrl) throw new Error("PORTAL_API_INTERNAL_URL is not set");

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

  if (meRes.status === 404 || meRes.status === 401 || meRes.status === 403) {
    return { error: "unmapped", status: meRes.status };
  }
  
  if (!meRes.ok || !coursesRes.ok) {
    return { error: "unavailable", status: 503 };
  }

  const me = await meRes.json();
  const courses = await coursesRes.json();
  return { me, courses: courses.data || [] };
}

function LearningHero({ firstName, total, inProgress, completed }: { firstName: string; total?: number; inProgress?: number; completed?: number }) {
  const stats = total === undefined ? null : [
    [String(total), "Total Kursus"],
    [String(inProgress ?? 0), "Sedang Berjalan"],
    [String(completed ?? 0), "Selesai"],
  ];
  return (
    <section className="portal-learning-hero rounded-2xl mb-8" data-techwind-pattern="course-dashboard-hero">
      <div className="relative z-10 max-w-2xl">
        <p className="portal-eyebrow !text-teal-200">Dasbor Pembelajar</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
          Halo, {firstName}!
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
          Lanjutkan kursus formal Anda dari Moodle dan temukan wawasan pendukung yang relevan untuk mempercepat kompetensi Anda.
        </p>
        {stats && (
          <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map(([value, label]) => (
              <div key={label} className="portal-learning-stat rounded-xl p-3 bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                <strong className="block text-2xl sm:text-3xl font-extrabold text-white">{value}</strong>
                <span className="text-xs font-semibold text-teal-200">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="portal-learning-hero-art" aria-hidden="true">
        <PortalIcon name="graduation" className="h-16 w-16" />
        <span />
        <span />
      </div>
    </section>
  );
}

function CertificateCard({ title, issuedAt, validUntil }: { title: string; issuedAt: string; validUntil?: string }) {
  return (
    <div className="portal-card p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
      <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
        <PortalIcon name="star" className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Sertifikat Kelulusan</span>
        <h3 className="mt-1 font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{title}</h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Diterbitkan: {new Date(issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        {validUntil && (
          <p className="text-xs text-slate-400">
            Berlaku hingga: {new Date(validUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function MyLearningDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/my-learning");

  const accessToken = await getBackendAccessToken();
  if (!accessToken) {
    // If we have a session but no access token (e.g. stale cookie from old version),
    // force a federated logout to clear the bad session and break the infinite loop.
    redirect("/api/auth/federated-logout");
  }

  const data = await getLearningData(accessToken);
  const firstName = session.user?.name?.split(" ")[0] || "Pembelajar";

  if (data.error === "unmapped") {
    return (
      <div className="portal-container py-10 sm:py-14">
        <LearningHero firstName={firstName} />
        <section className="portal-card my-10 p-7 text-center" aria-labelledby="learning-account-unmapped">
          <h2 id="learning-account-unmapped" className="text-2xl font-black text-slate-900">Akun Belum Terhubung</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Akun pembelajaran formal Anda belum terhubung. Hubungi administrator untuk mengakses kursus Moodle; konten tersimpan dan rekomendasi Portal tetap tersedia di bawah ini.</p>
        </section>
        <EngagementDiscovery />
      </div>
    );
  }

  if (data.error === "unavailable") {
    return (
      <div className="portal-container py-10 sm:py-14">
        <LearningHero firstName={firstName} />
        <section className="portal-card my-10 p-7 text-center" aria-labelledby="learning-service-unavailable">
          <h2 id="learning-service-unavailable" className="text-2xl font-black text-slate-900">Layanan Kursus Tidak Tersedia</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Data pembelajaran formal sementara tidak dapat dimuat. Konten tersimpan dan rekomendasi Portal tetap tersedia di bawah ini.</p>
        </section>
        <EngagementDiscovery />
      </div>
    );
  }
  const courses: EnrolledCourse[] = data.courses;

  const inProgress = courses.filter((c) => !c.completed);
  const completed = courses.filter((c) => c.completed);

  const continueCourse = [...inProgress].sort((a, b) => {
    return (b.last_access || 0) - (a.last_access || 0);
  })[0];

  const moodleBaseUrl = process.env.MOODLE_PUBLIC_BASE_URL || process.env.TB_MOODLE_URL || "http://localhost:8082";

  return (
    <div className="portal-container py-10 sm:py-14">
      <LearningHero firstName={firstName} total={courses.length} inProgress={inProgress.length} completed={completed.length} />

      <CourseList 
        courses={courses} 
        continueCourse={continueCourse} 
        moodleBaseUrl={moodleBaseUrl}
      />
      
      {completed.length > 0 && (
        <section className="mt-12">
          <h2 className="portal-section-title">Sertifikat Anda</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {completed.slice(0, 4).map((course) => (
              <CertificateCard 
                key={course.id} 
                title={course.full_name || course.short_name} 
                issuedAt={course.enrolled_at ? new Date(course.enrolled_at).toISOString() : "Belum ditentukan"} 
              />
            ))}
          </div>
        </section>
      )}
      
      <EngagementDiscovery />
    </div>
  );
}
