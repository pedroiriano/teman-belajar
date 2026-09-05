import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import MediaUploader from "./MediaUploader";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminDataTable } from "@/components/admin-data-table";
import { AdminUnauthorized } from "@/components/admin-states";
import { MediaPreviewImage } from "@/components/media/MediaPreviewImage";
import { CubaMediaTable } from "@/components/media/cuba-media-table";
import type { MediaAsset } from "@/components/media/types";

async function getAdminMedia(token: string, query: string, kind: string, page: number, pageSize: number) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const params = new URLSearchParams({ q: query, kind, page: String(page), page_size: String(pageSize) });
    const res = await fetch(`${API_BASE}/api/v1/admin/media?${params}`, {
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

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string; page_size?: string }>;
}) {
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
    return <AdminUnauthorized resource="media" />;
  }

  const canUpload = session.roles?.some((r: string) =>
    ["Portal Administrator", "Content Editor"].includes(r)
  );

  const params = await searchParams;
  const query = (params.q ?? "").slice(0, 100);
  const kind = ["all", "image", "document", "video"].includes(params.kind ?? "") ? params.kind! : "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const requestedPageSize = Number.parseInt(params.page_size || "20", 10);
  const pageSize = [10, 20, 50].includes(requestedPageSize) ? requestedPageSize : 20;
  const mediaRes = accessToken ? await getAdminMedia(accessToken, query, kind, page, pageSize) : null;
  const mediaAssets: MediaAsset[] = Array.isArray(mediaRes?.data) ? mediaRes.data : [];
  const total = Number(mediaRes?.meta?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (total > 0 && page > pages) {
    redirect(`/dashboard/media?q=${encodeURIComponent(query)}&kind=${kind}&page=${pages}&page_size=${pageSize}`);
  }

  return (
    <div className="admin-page space-y-6">
      <div className="admin-page-header border-b border-slate-200/70 dark:border-slate-800 pb-5">
        <div>
          <p className="admin-kicker">Manajemen aset</p>
          <h1 className="admin-page-title">Pustaka Media</h1>
          <p className="admin-page-copy">
            Kelola gambar, video, dan dokumen yang digunakan dalam konten Teman Belajar.
          </p>
        </div>
      </div>

      {canUpload && <MediaUploader />}

      <form
        className="admin-card grid gap-3 p-4 sm:p-5 sm:grid-cols-[1fr_200px_auto] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        method="get"
      >
        <div>
          <label htmlFor="media-search" className="sr-only">
            Cari media
          </label>
          <input
            id="media-search"
            name="q"
            defaultValue={query}
            className="admin-input"
            placeholder="Cari nama tampilan, nama asli, atau judul…"
          />
        </div>
        <div>
          <label htmlFor="media-kind" className="sr-only">
            Jenis media
          </label>
          <select id="media-kind" name="kind" defaultValue={kind} className="admin-input">
            <option value="all">Semua jenis</option>
            <option value="image">Gambar</option>
            <option value="video">Video</option>
            <option value="document">Dokumen PDF</option>
          </select>
        </div>
        <button type="submit" className="admin-button !py-2.5 !px-4 shadow-sm font-bold text-xs">
          Terapkan filter
        </button>
      </form>

      {mediaAssets.some((asset) => asset.detected_mime_type.startsWith("image/")) && (
        <section
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          aria-labelledby="media-gallery-title"
        >
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pratinjau visual</p>
              <h2 id="media-gallery-title" className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                Galeri aset terbaru
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {total} aset
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
            {mediaAssets
              .filter((asset) => asset.detected_mime_type.startsWith("image/"))
              .slice(0, 6)
              .map((asset) => (
                <Link
                  key={asset.id}
                  href={`/dashboard/media/${asset.id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 transition hover:border-sky-400"
                >
                  <span className="block aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <MediaPreviewImage
                      src={`/api/bff/media/${asset.id}/content`}
                      alt={asset.alt_text || asset.display_filename || asset.original_filename || "Pratinjau media"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="block truncate p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {asset.display_filename || asset.original_filename}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* AdminDataTable presentation via CubaMediaTable with multi-select and pagination */}
      <CubaMediaTable
        mediaAssets={mediaAssets}
        itemCount={total}
        canUpload={Boolean(canUpload)}
        errorMessage={mediaRes ? null : "Data media gagal dimuat. Periksa koneksi backend."}
        paginationSlot={
          <AdminPagination
            page={page}
            pages={pages}
            total={total}
            pageSize={pageSize}
            pathname="/dashboard/media"
            query={{ q: query, kind }}
          />
        }
      />
    </div>
  );
}
