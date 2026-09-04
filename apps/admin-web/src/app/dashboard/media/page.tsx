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
      <div className="admin-page-header">
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
        <button type="submit" className="admin-button">
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

      <AdminDataTable
        title="Daftar aset"
        description="Metadata, ukuran, dan status penyimpanan media"
        itemCount={total}
        headers={[
          { label: "Pratinjau", key: "preview" },
          { label: "Detail berkas", key: "details" },
          { label: "Ukuran", key: "size" },
          { label: "Dibuat", key: "created_at" },
          { label: "Aksi", key: "actions" },
        ]}
        emptyState={
          canUpload ? "Belum ada media. Silakan unggah berkas baru." : "Belum ada media yang dapat ditinjau."
        }
        error={mediaRes ? null : "Data media gagal dimuat. Periksa koneksi backend."}
        retryHref="/dashboard/media"
      >
        {mediaAssets.map((asset) => (
          <tr
            key={asset.id}
            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
          >
            <td className="p-4" data-label="Pratinjau">
              {asset.detected_mime_type.startsWith("image/") ? (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  <MediaPreviewImage
                    src={`/api/bff/media/${asset.id}/content`}
                    alt={asset.alt_text || asset.display_filename || asset.original_filename || "Pratinjau media"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                  {asset.detected_mime_type.split("/")[1]?.toUpperCase().substring(0, 4) || "FILE"}
                </div>
              )}
            </td>
            <td className="p-4" data-label="Detail berkas">
              <div
                className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]"
                title={asset.display_filename || asset.original_filename || undefined}
              >
                {asset.display_filename || asset.original_filename || asset.title || "Tanpa Judul"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col gap-1">
                <span>{asset.detected_mime_type}</span>
                <span
                  className={`cuba-badge w-fit ${
                    asset.status === "active"
                      ? "cuba-badge-success"
                      : "cuba-badge-neutral"
                  }`}
                >
                  {asset.status === "active" ? "Aktif" : asset.status === "archived" ? "Diarsipkan" : asset.status}
                </span>
              </div>
            </td>
            <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Ukuran">
              {formatBytes(asset.size_bytes)}
            </td>
            <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Dibuat">
              {asset.created_at ? new Date(asset.created_at).toLocaleDateString("id-ID") : "-"}
            </td>
            <td className="p-4 text-xs font-semibold" data-label="Aksi">
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/media/${asset.id}`}
                  className="font-bold text-sky-700 dark:text-sky-400 hover:underline"
                >
                  {canUpload ? "Kelola" : "Lihat"}
                </Link>
                {asset.status === "active" && (
                  <a
                    href={`/api/bff/media/${asset.id}/content`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    Buka
                  </a>
                )}
              </div>
            </td>
          </tr>
        ))}
      </AdminDataTable>

      <AdminPagination
        page={page}
        pages={pages}
        total={total}
        pageSize={pageSize}
        pathname="/dashboard/media"
        query={{ q: query, kind }}
      />
    </div>
  );
}
