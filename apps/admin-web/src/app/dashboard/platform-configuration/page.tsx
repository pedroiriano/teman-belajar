import { getServerSession } from "next-auth";
import { PlatformConfigurationEditor } from "@/components/platform-configuration-editor";
import { authOptions } from "@/lib/auth";
import type { PlatformConfigurationState } from "@/lib/platform-configuration";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function loadState(token: string): Promise<PlatformConfigurationState | null> {
  try { const response = await fetch(`${API_BASE}/api/v1/admin/platform-configuration`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) }); return response.ok ? await response.json() as PlatformConfigurationState : null; } catch { return null; }
}

export default async function PlatformConfigurationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) return <main className="admin-page"><div className="admin-alert-error"><h1 className="font-black">Akses ditolak</h1><p className="mt-2 text-sm">Konfigurasi Platform hanya tersedia untuk Portal Administrator.</p></div></main>;
  const token = await getServerAccessToken(); const state = token ? await loadState(token) : null;
  if (!state) return <main className="admin-page"><div className="admin-alert-error"><h1 className="font-black">Konfigurasi belum tersedia</h1><p className="mt-2 text-sm">Portal API tidak dapat dimuat. Tidak ada konfigurasi publik yang diubah.</p></div></main>;
  const safeState = { ...state, versions: state.versions || [], ...(state.head_version === 0 && !state.draft && !state.published ? { draft: undefined, published: undefined } : {}) };
  return <main className="admin-page"><div className="admin-page-header"><div><p className="admin-kicker">TASK-020</p><h1 className="admin-page-title">Konfigurasi Platform</h1><p className="admin-page-copy">Kelola presentasi non-secret dengan draf, pratinjau privat, publikasi atomik, dan rollback versioned. Nama Teman Belajar tetap immutable.</p></div><span className="admin-status bg-sky-50 text-sky-800">Versi {safeState.head_version || "awal"}</span></div><PlatformConfigurationEditor initialState={safeState.head_version === 0 ? { ...safeState, versions: [], draft: undefined, published: undefined } : safeState} /></main>;
}
