import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAdminRecommendationPinsAction } from "@/app/actions/recommendations";
import { CubaRecommendationWorkspace } from "@/components/recommendations/cuba-recommendation-workspace";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/recommendations");
  }

  const result = await getAdminRecommendationPinsAction();
  const pins = result.success && result.data ? result.data : [];

  return (
    <div className="admin-page space-y-6" data-cuba-page="recommendations">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Kurasi Editorial</p>
          <h1 className="admin-page-title">Kurasi Rekomendasi 2.0</h1>
          <p className="admin-page-copy">
            Kelola konten prioritas (*editorial pinning*) dan pengaturan bobot rekomendasi beranda pengguna.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/statistics"
            className="admin-button-secondary text-xs"
          >
            Statistik Pembelajaran
          </Link>
          <Link
            href="/dashboard/workflow"
            className="admin-button-secondary text-xs"
          >
            Alur Kerja
          </Link>
        </div>
      </div>

      <CubaRecommendationWorkspace initialPins={pins} />
    </div>
  );
}
