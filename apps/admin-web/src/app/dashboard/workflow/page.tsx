import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { AdminIcon } from "@/components/admin-icon";
import { authOptions } from "@/lib/auth";
import { getWorkflowItemsAction } from "@/app/actions/workflow";
import { CubaKanbanBoard } from "@/components/workflow/cuba-kanban-board";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard/workflow");

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
        <p className="mt-3 text-slate-600">Akun ini belum memiliki role editorial yang diperlukan.</p>
        <Link href="/api/auth/federated-logout" prefetch={false} className="admin-button mt-6">
          Keluar dan masuk kembali
        </Link>
      </div>
    );
  }

  const result = await getWorkflowItemsAction();
  const items = result.success ? result.data : [];

  const draftCount = items.filter((i) => i.status === "draft").length;
  const inReviewCount = items.filter((i) => i.status === "in_review").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const publishedCount = items.filter((i) => i.status === "published").length;

  return (
    <div className="admin-page space-y-7">
      {/* Page Header Stack */}
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Alur kerja editorial</p>
          <h1 className="admin-page-title">Papan Kanban Alur Kerja Terpadu</h1>
          <p className="admin-page-copy">
            Pantau dan kelola siklus hidup materi pembelajaran lintas modul dari tahap draf hingga terbit.
          </p>
        </div>
        <div className="inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
          <span className="mr-2 h-2 w-2 rounded-full bg-sky-500" />
          5 tahapan alur kerja
        </div>
      </div>

      {/* Mini Stat Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Statistik alur kerja">
        <div className="admin-card border-l-4 border-l-slate-400 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Draf</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <AdminIcon name="file" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{draftCount}</p>
        </div>

        <div className="admin-card border-l-4 border-l-yellow-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Menunggu Tinjauan</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-yellow-100 text-xs font-black text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300">
              <AdminIcon name="audit" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{inReviewCount}</p>
        </div>

        <div className="admin-card border-l-4 border-l-sky-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disetujui</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-xs font-black text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
              <AdminIcon name="knowledge" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{approvedCount}</p>
        </div>

        <div className="admin-card border-l-4 border-l-emerald-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Konten Terbit</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <AdminIcon name="dashboard" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{publishedCount}</p>
        </div>
      </section>

      {/* Kanban Board Component */}
      <CubaKanbanBoard initialItems={items} />
    </div>
  );
}
