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
  const stats = total === undefined ? null : [[String(total), "Total Kursus"], [String(inProgress ?? 0), "Sedang Berjalan"], [String(completed ?? 0), "Selesai"]];
  return <section className="portal-learning-hero" data-techwind-pattern="course-dashboard-hero"><div className="relative z-10 max-w-2xl"><p className="portal-eyebrow !text-teal-200">Pembelajaran Saya</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Halo, {firstName}!</h1><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Lanjutkan kursus formal Anda dan temukan pengetahuan pendukung dalam satu pengalaman.</p>{stats && <div className="mt-7 grid grid-cols-3 gap-3">{stats.map(([value, label]) => <div key={label} className="portal-learning-stat"><strong>{value}</strong><span>{label}</span></div>)}</div>}</div><div className="portal-learning-hero-art" aria-hidden="true"><PortalIcon name="graduation" className="h-16 w-16" /><span /><span /></div></section>;
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
      <EngagementDiscovery />
    </div>
  );
}
