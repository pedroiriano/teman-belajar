import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAdminWebinarsAction } from "@/app/actions/webinars";
import { CubaWebinarWorkspace } from "@/components/webinars/cuba-webinar-workspace";

export const dynamic = "force-dynamic";

export default async function WebinarsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/webinars");
  }

  const result = await getAdminWebinarsAction();
  const webinars = result.success && result.data ? result.data.items : [];

  return (
    <div className="admin-page space-y-6" data-cuba-page="webinars">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Pembelajaran Interaktif</p>
          <h1 className="admin-page-title">Webinar & Sesi Live</h1>
          <p className="admin-page-copy">
            Kelola jadwal sesi tatap muka daring, narasumber, integrasi Zoom Moodle, dan kehadiran peserta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Provider: mod_zoom Authoritative
          </div>
          <Link
            href="/dashboard/schedule"
            className="admin-button-secondary text-xs"
          >
            Kalender Jadwal
          </Link>
        </div>
      </div>

      <CubaWebinarWorkspace initialWebinars={webinars} />
    </div>
  );
}
