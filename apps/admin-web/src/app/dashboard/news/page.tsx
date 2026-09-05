import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminUnauthorized } from "@/components/admin-states";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminPagination } from "@/components/admin-pagination";
import { CubaNewsTable } from "@/components/bulk-actions/cuba-news-table";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "in_review" | "approved" | "published" | "rejected" | "archived";
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface NewsApiResponse {
  data: NewsArticle[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

async function getAdminNews(token: string, page: number, pageSize: number): Promise<NewsApiResponse | null> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/news?${params}`, {
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




export default async function AdminNewsPage({
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
    return <AdminUnauthorized resource="berita" />;
  }

  const newsRes = accessToken ? await getAdminNews(accessToken, page, pageSize) : null;
  const news = newsRes?.data || [];
  const pagination = newsRes?.pagination || {
    page,
    page_size: pageSize,
    total: news.length,
    total_pages: news.length ? 1 : 0,
  };

  if (pagination.total_pages > 0 && page > pagination.total_pages) {
    redirect(`/dashboard/news?page=${pagination.total_pages}&page_size=${pageSize}`);
  }

  const headerActions = (
    <Link
      href="/dashboard/news/create"
      className="admin-button !py-2.5 !px-4 shadow-sm font-bold text-xs"
    >
      <span aria-hidden="true">+</span> Buat berita
    </Link>
  );

  return (
    <div className="admin-page space-y-6">
      <div className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-800 pb-5">
        <div>
          <p className="admin-kicker">Manajemen konten</p>
          <h1 className="admin-page-title">Berita</h1>
          <p className="admin-page-copy">
            Susun, tinjau, dan kelola alur kerja berita dan pengumuman publik Teman Belajar.
          </p>
        </div>
        <div>
          {headerActions}
        </div>
      </div>

      {/* AdminDataTable presentation via CubaNewsTable with multi-select bulk operations */}
      <CubaNewsTable
        news={news}
        itemCount={pagination.total}
        headerActions={headerActions}
        errorMessage={newsRes ? null : "Data berita gagal dimuat. Periksa koneksi backend."}
      />


      <AdminPagination
        page={pagination.page}
        pages={pagination.total_pages}
        total={pagination.total}
        pageSize={pagination.page_size}
        pathname="/dashboard/news"
      />
    </div>
  );
}
