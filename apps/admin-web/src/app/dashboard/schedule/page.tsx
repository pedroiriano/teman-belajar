import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getScheduleEventsAction } from "@/app/actions/schedule";
import { CubaScheduleCalendar } from "@/components/schedule/cuba-schedule-calendar";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/schedule");
  }

  const result = await getScheduleEventsAction("2026-09");
  const events = result.success ? result.data : [];
  const conflictCount = result.success ? result.conflictCount : 0;

  return (
    <div className="admin-page space-y-6" data-cuba-page="schedule">
      {/* Top Breadcrumb & Live Context Bar */}
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Ruang Kerja Editorial</p>
          <h1 className="admin-page-title">Jadwal Publikasi Terpadu</h1>
          <p className="admin-page-copy">
            Kalender jadwal rilis konten lintas modul dan batch cohort pembelajaran.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            Timezone: Asia/Jakarta (WIB)
          </div>
          <Link
            href="/dashboard/workflow"
            className="admin-button-secondary text-xs"
          >
            Lihat Alur Kerja
          </Link>
        </div>
      </div>

      {/* Cuba Interactive Schedule Calendar */}
      <CubaScheduleCalendar
        initialEvents={events}
        initialConflictCount={conflictCount}
      />
    </div>
  );
}
