import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBackendAccessToken } from "@/lib/server-auth";
import { CourseList } from "@/components/learning/course-list";

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

  if (data.error === "unmapped") {
    return (
      <div className="portal-container py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Akun Belum Terhubung</h1>
        <p className="mt-4 text-slate-600">
          Akun pembelajaran Anda belum terhubung. Silakan hubungi administrator.
        </p>
      </div>
    );
  }

  if (data.error === "unavailable") {
    return (
      <div className="portal-container py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Layanan Tidak Tersedia</h1>
        <p className="mt-4 text-slate-600">
          Data pembelajaran sementara tidak dapat dimuat. Coba lagi beberapa saat.
        </p>
      </div>
    );
  }

  const firstName = session.user?.name?.split(" ")[0] || "Pembelajar";
  const { courses } = data;

  const inProgress = courses.filter((c: any) => c.status !== "completed");
  const completed = courses.filter((c: any) => c.status === "completed");

  const continueCourse = [...inProgress].sort((a: any, b: any) => {
    return (b.last_access || 0) - (a.last_access || 0);
  })[0];

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
      />
    </div>
  );
}
