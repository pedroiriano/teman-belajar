import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminPagination } from "@/components/admin-pagination";

interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "in_review" | "approved" | "published" | "rejected" | "archived";
  current_revision_no: number;
  published_revision_no?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface KnowledgeApiResponse {
  data: KnowledgeArticle[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

async function getAdminKnowledge(token: string, page: number, pageSize: number): Promise<KnowledgeApiResponse | null> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 }, // no cache for admin
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const statusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Dalam peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  rejected: "Perlu revisi",
  archived: "Diarsipkan",
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "approved":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300";
    case "in_review":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300";
    case "rejected":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
    case "draft":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "archived":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default async function AdminKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; page_size?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const requestedPageSize = Number.parseInt(params.page_size || "20", 10);
  const pageSize = [10, 20, 50].includes(requestedPageSize) ? requestedPageSize : 20;
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session) {
    redirect("/api/auth/signin");
  }

  // Allow Portal Administrator, Content Editor, or Reviewer
  const hasAccess = session.roles?.some((r: string) =>
    ["Portal Administrator", "Content Editor", "Reviewer"].includes(r)
  );

  if (!hasAccess) {
    return <AdminUnauthorized resource="artikel pengetahuan" />;
  }

  const knowledgeRes = accessToken ? await getAdminKnowledge(accessToken, page, pageSize) : null;
  const articles = knowledgeRes?.data || [];
  const pagination = knowledgeRes?.pagination || {
    page,
    page_size: pageSize,
    total: articles.length,
    total_pages: articles.length ? 1 : 0,
  };

  if (pagination.total_pages > 0 && page > pagination.total_pages) {
    redirect(`/dashboard/knowledge?page=${pagination.total_pages}&page_size=${pageSize}`);
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard/knowledge-hierarchy"
        className="admin-button-secondary !min-h-9 !py-1 !px-3 !text-xs"
      >
        Kelola struktur
      </Link>
      <Link
        href="/dashboard/knowledge/create"
        className="admin-button !min-h-9 !py-1 !px-3 !text-xs"
      >
        <span aria-hidden="true">+</span> Buat artikel
      </Link>
    </div>
  );

  return (
    <div className="admin-page space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Manajemen konten</p>
          <h1 className="admin-page-title">Pusat Pengetahuan</h1>
          <p className="admin-page-copy">
            Kelola artikel, revisi, taksonomi, dan alur kerja peninjauan materi operasional.
          </p>
        </div>
      </div>

      <AdminDataTable
        title="Daftar artikel"
        description="Versi dan status publikasi kanonis artikel pengetahuan"
        itemCount={pagination.total}
        headers={[
          { label: "Judul", key: "title" },
          { label: "Status", key: "status" },
          { label: "Revisi aktif / terbit", key: "revision" },
          { label: "Aksi", key: "actions" },
        ]}
        emptyState="Belum ada artikel pengetahuan. Buat draf pertama untuk memulai."
        error={knowledgeRes ? null : "Data artikel gagal dimuat. Periksa koneksi backend."}
        retryHref="/dashboard/knowledge"
        actions={headerActions}
      >
        {articles.map((article) => (
          <tr
            key={article.id}
            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
          >
            <td className="p-4" data-label="Judul">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {article.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {article.slug}
              </div>
            </td>
            <td className="p-4" data-label="Status">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(
                  article.status
                )}`}
              >
                {statusLabels[article.status] || article.status.replace("_", " ")}
              </span>
            </td>
            <td
              className="p-4 text-xs text-slate-600 dark:text-slate-400"
              data-label="Revisi"
            >
              <span>Revisi {article.current_revision_no}</span>
              <span className="ml-1 text-slate-400 dark:text-slate-500">
                {article.published_revision_no
                  ? `(Terbit: Rev ${article.published_revision_no})`
                  : "(Belum terbit)"}
              </span>
            </td>
            <td className="p-4 text-xs font-semibold" data-label="Aksi">
              <Link
                href={`/dashboard/knowledge/${article.id}`}
                className="font-bold text-sky-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                Buka detail <span aria-hidden="true">→</span>
              </Link>
            </td>
          </tr>
        ))}
      </AdminDataTable>

      <AdminPagination
        page={pagination.page}
        pages={pagination.total_pages}
        total={pagination.total}
        pageSize={pagination.page_size}
        pathname="/dashboard/knowledge"
      />
    </div>
  );
}
