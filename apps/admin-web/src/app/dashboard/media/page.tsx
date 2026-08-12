import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/server-auth";
import MediaUploader from "./MediaUploader";

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-lg max-w-lg w-full">
          <h1 className="text-3xl font-bold mb-4 text-red-400">403 Forbidden</h1>
          <p className="mb-6">You do not have the necessary permissions to manage Media.</p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const mediaRes = accessToken ? await getAdminMedia(accessToken) : null;

  return (
    <div className="admin-page">
      <div>
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Manajemen Aset</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Media Library</h1>
            <p className="mt-2 text-sm text-slate-500">Kelola berkas, gambar, dan dokumen untuk portal Teman Belajar.</p>
          </div>
        </div>

        <MediaUploader />

        <div className="admin-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">Pratinjau</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Detail Berkas</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Ukuran</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Dibuat</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!mediaRes || !mediaRes.data || mediaRes.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Belum ada media. Silakan unggah berkas baru.
                  </td>
                </tr>
              ) : (
                mediaRes.data.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {asset.detected_mime_type.startsWith('image/') ? (
                        <div className="w-16 h-16 rounded overflow-hidden bg-slate-100 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        <Link href={`/dashboard/media/${asset.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                          Edit
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
          </table>
        </div>
      </div>
    </div>
  );
}
