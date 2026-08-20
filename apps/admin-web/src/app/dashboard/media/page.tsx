/* eslint-disable @next/next/no-img-element -- Media Library previews authenticated BFF assets with runtime MIME types. */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import MediaUploader from "./MediaUploader";
import { AdminIcon } from "@/components/admin-icon";
import { AdminUnauthorized } from "@/components/admin-states";

async function getAdminMedia(token: string) {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 } // no cache for admin
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default async function AdminMediaPage() {
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

  const mediaRes = accessToken ? await getAdminMedia(accessToken) : null;
  const mediaAssets = Array.isArray(mediaRes?.data) ? mediaRes.data : [];

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">Manajemen aset</p><h1 className="admin-page-title">Media Library</h1><p className="admin-page-copy">Kelola gambar dan dokumen yang digunakan dalam konten Teman Belajar.</p>
          </div>
        </div>

        {canUpload && <MediaUploader />}

        {mediaAssets.some((asset: any) => asset.detected_mime_type.startsWith("image/")) && <section className="mb-7" aria-labelledby="media-gallery-title"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Pratinjau visual</p><h2 id="media-gallery-title" className="mt-1 text-xl font-black text-slate-900">Galeri aset</h2></div><span className="admin-status bg-slate-100 text-slate-600">{mediaAssets.length} aset</span></div><div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">{mediaAssets.filter((asset: any) => asset.detected_mime_type.startsWith("image/")).slice(0, 6).map((asset: any) => <Link key={asset.id} href={`/dashboard/media/${asset.id}`} className="admin-card group overflow-hidden"><span className="block aspect-square overflow-hidden bg-slate-100"><img src={`/api/bff/media/${asset.id}/content`} alt={asset.alt_text || asset.original_filename} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /></span><span className="block truncate p-3 text-xs font-bold text-slate-700">{asset.original_filename}</span></Link>)}</div></section>}

        <div className="admin-table-shell"><div className="admin-table-toolbar"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="file" className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Daftar aset</h2><p className="mt-1 text-xs text-slate-500">Metadata, ukuran, dan status media</p></div></div></div><div className="overflow-x-auto"><table className="admin-table">
            <thead>
              <tr><th>Pratinjau</th><th>Detail berkas</th><th>Ukuran</th><th>Dibuat</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!mediaRes || !mediaRes.data || mediaRes.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    {canUpload ? "Belum ada media. Silakan unggah berkas baru." : "Belum ada media yang dapat ditinjau."}
                  </td>
                </tr>
              ) : (
                mediaRes.data.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {asset.detected_mime_type.startsWith('image/') ? (
                        <div className="w-16 h-16 rounded overflow-hidden bg-slate-100 border border-slate-200">
                          <img 
                            src={`/api/bff/media/${asset.id}/content`} 
                            alt={asset.alt_text || asset.original_filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If BFF doesn't proxy the image directly (BFF GET endpoint was added, but content delivery is /api/v1/media/{id}/content)
                              // Wait, the BFF detail endpoint is for metadata. Let's fallback to a placeholder.
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTRweCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJyb2tlbjwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {asset.detected_mime_type.split('/')[1]?.toUpperCase().substring(0, 4)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]" title={asset.original_filename}>
                        {asset.original_filename || asset.title || 'Tanpa Judul'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
                        <span>{asset.detected_mime_type}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] w-fit font-medium capitalize
                          ${asset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {asset.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {formatBytes(asset.size_bytes)}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex gap-3">
                        <Link href={`/dashboard/media/${asset.id}`} className="font-bold text-sky-700 hover:text-sky-600">
                          {canUpload ? "Kelola" : "Lihat"}
                        </Link>
                        {/* We could add a public view link if active, e.g. /api/v1/media/{id}/content */}
                        {asset.status === 'active' && (
                          <a 
                            href={`${process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:8080'}/api/v1/media/${asset.id}/content`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Buka
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}

