import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getReviewQueueItemsAction } from "@/app/actions/review-queue";
import { CubaReviewQueue } from "@/components/review-queue/cuba-review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/review-queue");
  }

  const roles = (session as typeof session & { roles?: string[] }).roles || [];
  const hasAccess = roles.some((role) =>
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(role)
  );

  if (!hasAccess) {
    return (
      <div className="admin-card mx-auto max-w-xl border-rose-200 p-8 text-center" role="alert">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 font-black text-rose-700">
          403
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Akses tidak tersedia</h1>
        <p className="mt-3 text-slate-600">Akun ini belum memiliki role editorial yang diperlukan untuk mengakses antrean peninjauan.</p>
        <Link href="/api/auth/federated-logout" prefetch={false} className="admin-button mt-6">
          Keluar dan masuk kembali
        </Link>
      </div>
    );
  }

  const result = await getReviewQueueItemsAction();
  const items = result.success && result.data ? result.data : [];

  return (
    <div className="admin-page space-y-6" data-cuba-page="review-queue">
      {/* Top Breadcrumb & Page Header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Ruang Kerja Editorial</p>
          <h1 className="admin-page-title">Antrean Peninjauan Khusus</h1>
          <p className="admin-page-copy">
            Tinjau, validasi, dan kelola persetujuan materi pembelajaran lintas modul secara terpusat dengan aksi persetujuan cepat dan catatan peninjau.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/workflow"
            className="admin-button-secondary text-xs"
          >
            Papan Kanban
          </Link>
          <Link
            href="/dashboard/schedule"
            className="admin-button-secondary text-xs"
          >
            Jadwal Publikasi
          </Link>
        </div>
      </div>

      {/* Cuba Interactive Review Queue Component */}
      <CubaReviewQueue initialItems={items} roles={roles} />
    </div>
  );
}
