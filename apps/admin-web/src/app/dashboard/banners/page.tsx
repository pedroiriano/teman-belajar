import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAdminBannersAction } from "@/app/actions/banners";
import { CubaBannersWorkspace } from "@/components/banners/cuba-banners-workspace";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/banners");
  }

  const result = await getAdminBannersAction({ pageSize: 100 });
  const banners = result.success && result.data ? result.data : [];

  return (
    <div className="admin-page space-y-6" data-cuba-page="banners">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Konten & Informasi</p>
          <h1 className="admin-page-title">Manajemen Banner Beranda</h1>
          <p className="admin-page-copy">
            Kelola slide Hero Banner pada halaman utama Web Publik. Anda dapat mendaftarkan berbagai banner dan mengaktifkan maksimal 3 banner secara bersamaan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/media"
            className="admin-button-secondary text-xs"
          >
            Pustaka Media
          </Link>
          <Link
            href="/dashboard/recommendations"
            className="admin-button-secondary text-xs"
          >
            Kurasi Rekomendasi
          </Link>
        </div>
      </div>

      <CubaBannersWorkspace initialBanners={banners} />
    </div>
  );
}
