import { getServerSession } from "next-auth";
import { PlatformConfigurationEditor } from "@/components/platform-configuration-editor";
import { authOptions } from "@/lib/auth";
import type { PlatformConfigurationState } from "@/lib/platform-configuration";
import { getServerAccessToken } from "@/lib/server-auth";
import { AdminIcon } from "@/components/admin-icon";

export const dynamic = "force-dynamic";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function loadState(token: string): Promise<PlatformConfigurationState | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/platform-configuration`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? ((await response.json()) as PlatformConfigurationState) : null;
  } catch {
    return null;
  }
}

export default async function PlatformConfigurationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return (
      <main className="admin-page">
        <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
          <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Akses ditolak</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Konfigurasi Platform hanya tersedia untuk Portal Administrator.
          </p>
        </div>
      </main>
    );
  }

  const token = await getServerAccessToken();
  const state = token ? await loadState(token) : null;
  if (!state) {
    return (
      <main className="admin-page">
        <div className="admin-card rounded-xl border border-rose-200 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20" role="alert">
          <h1 className="text-xl font-black text-rose-700 dark:text-rose-300">Konfigurasi belum tersedia</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Portal API tidak dapat dimuat. Tidak ada konfigurasi publik yang diubah.
          </p>
        </div>
      </main>
    );
  }

  const safeState = {
    ...state,
    versions: state.versions || [],
    ...(state.head_version === 0 && !state.draft && !state.published
      ? { draft: undefined, published: undefined }
      : {}),
  };

  return (
    <main className="admin-page space-y-6">
      {/* Header Cuba */}
      <div className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
            TASK-020 &bull; ADMINISTRASI SISTEM
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Konfigurasi Platform
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola presentasi non-secret dengan draf, pratinjau privat, publikasi atomik, dan rollback versioned. Nama Teman Belajar tetap immutable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="admin-status inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-800 dark:border-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
            <AdminIcon name="settings" className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Versi {safeState.head_version || "awal"}</span>
          </span>
        </div>
      </div>

      <PlatformConfigurationEditor
        initialState={
          safeState.head_version === 0
            ? { ...safeState, versions: [], draft: undefined, published: undefined }
            : safeState
        }
      />
    </main>
  );
}
