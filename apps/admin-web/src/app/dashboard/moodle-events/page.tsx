import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getMoodleEventsSummaryAction,
  listMoodleEventsAction,
} from "@/app/actions/moodle-events";
import { CubaMoodleEventsWorkspace } from "@/components/moodle-events/cuba-moodle-events-workspace";

export const dynamic = "force-dynamic";

export default async function MoodleEventsPage() {
  const session: any = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/moodle-events");
  }

  if (!session?.roles?.includes("Portal Administrator")) {
    return (
      <div className="admin-page" data-cuba-page="moodle-events">
        <div
          className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20"
          role="alert"
        >
          <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Panel Pemantauan Moodle Event Inbox hanya tersedia untuk Portal Administrator.
          </p>
        </div>
      </div>
    );
  }

  const [summaryRes, listRes] = await Promise.all([
    getMoodleEventsSummaryAction(),
    listMoodleEventsAction({ limit: 50, offset: 0 }),
  ]);

  const summary = summaryRes.success && summaryRes.data
    ? summaryRes.data
    : { pending: 0, processing: 0, processed: 0, dead_letter: 0, total: 0 };

  const events = listRes.success && listRes.data ? listRes.data.items : [];
  const total = listRes.success && listRes.data ? listRes.data.total : 0;

  return (
    <div className="admin-page space-y-6" data-cuba-page="moodle-events">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Platform Integrasi</p>
          <h1 className="admin-page-title">Moodle Event Inbox</h1>
          <p className="admin-page-copy">
            Pemantauan throughput peristiwa asinkron Moodle LMS, verifikasi sidik jari (*fingerprint*), dan rekonsiliasi kegagalan pemrosesan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/integration-health"
            className="admin-button-secondary text-xs"
          >
            Kesehatan Integrasi
          </Link>
          <Link
            href="/dashboard/audit"
            className="admin-button-secondary text-xs"
          >
            Audit Center
          </Link>
        </div>
      </div>

      <CubaMoodleEventsWorkspace
        initialSummary={summary}
        initialEvents={events}
        initialTotal={total}
      />
    </div>
  );
}
