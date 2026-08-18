import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBackendAccessToken } from "@/lib/server-auth";
import { CourseList } from "@/components/learning/course-list";
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
        <div className="rounded-3xl bg-[#102a43] p-7 text-white shadow-xl sm:p-10">
          <p className="text-sm font-bold text-teal-300">Pembelajaran Saya</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Halo, {firstName}!</h1>
        </div>
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
        <div className="rounded-3xl bg-[#102a43] p-7 text-white shadow-xl sm:p-10">
          <p className="text-sm font-bold text-teal-300">Pembelajaran Saya</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Halo, {firstName}!</h1>
        </div>
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
      <div className="rounded-3xl bg-[#102a43] p-7 text-white shadow-xl sm:p-10">
        <p className="text-sm font-bold text-teal-300">Pembelajaran Saya</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Halo, {firstName}!</h1>
        <div className="mt-6 flex gap-6 text-sm font-bold">
          <div>
            <span className="block text-2xl font-black text-white">{courses.length}</span>
            <span className="text-slate-400">Total Kursus</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-teal-300">{inProgress.length}</span>
            <span className="text-slate-400">Sedang Berjalan</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-green-400">{completed.length}</span>
            <span className="text-slate-400">Selesai</span>
          </div>
        </div>
      </div>

      <CourseList 
        courses={courses} 
        continueCourse={continueCourse} 
        moodleBaseUrl={moodleBaseUrl}
      />
      <EngagementDiscovery />
    </div>
  );
}
