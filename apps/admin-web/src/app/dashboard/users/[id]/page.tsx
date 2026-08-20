import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { toggleUserAction, updateUserRolesAction } from "@/app/actions/users";
import Link from "next/link";
import { KeycloakUser, KeycloakRole } from "@/types/user";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as any;
  const roles = session?.roles || [];
  const hasAccess = roles.some((role: string) => ["Portal Administrator", "Content Editor", "Reviewer"].includes(role));
  const isPortalAdmin = roles.includes("Portal Administrator");

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const { id } = await params;
  
  // Fetch user details
  const userRes = await kcAdminFetch(`/users/${id}`);
  if (!userRes.ok) throw new Error("Failed to fetch user");
  const user: KeycloakUser = await userRes.json();

  // Fetch available roles
  const rolesRes = await kcAdminFetch("/roles");
  const allRoles: KeycloakRole[] = await rolesRes.json();
  const internalRoles = ["uma_authorization", "offline_access"];
  const availableRoles = allRoles.filter((r) => !internalRoles.includes(r.name) && !r.name.startsWith("default-roles-"));

  // Fetch current user roles
  const currentRolesRes = await kcAdminFetch(`/users/${id}/role-mappings/realm`);
  const currentRoles: KeycloakRole[] = await currentRolesRes.json();
  const currentRoleNames = currentRoles.map(r => r.name);

  // Bind actions
  const toggleUser = toggleUserAction.bind(null, id, !user.enabled);
  const updateRoles = updateUserRolesAction.bind(null, id);

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 font-medium">
              <Link href="/dashboard/users" className="hover:text-sky-600 transition-colors">Manajemen Pengguna</Link>
              <span>/</span>
              <span>Detail Pengguna</span>
            </div>
            <p className="admin-kicker">PROFIL PENGGUNA</p>
            <h1 className="admin-page-title">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
            </h1>
          </div>
          {isPortalAdmin && (
            <form action={toggleUser}>
              <button 
                type="submit"
                className="admin-button-secondary"
              >
                {user.enabled ? "Nonaktifkan Akun" : "Aktifkan Akun"}
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="admin-card p-6">
              <h3 className="text-lg font-black text-slate-900 mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">Informasi Akun</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{user.username}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{user.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`admin-status ${
                      user.enabled ? "bg-green-100 text-green-800" : "bg-red-50 text-rose-700"
                    }`}>
                      {user.enabled ? "Active" : "Disabled"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Bergabung Sejak</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {user.createdTimestamp ? new Date(user.createdTimestamp).toLocaleDateString("id-ID") : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="admin-form-card">
              <div className="admin-form-header">
                <h3 className="font-black text-slate-900">Kelola Role</h3>
              </div>
              <form action={updateRoles}>
                <div className="admin-form-body">
                  <p className="text-sm text-slate-500 mb-4">Centang role yang ingin diberikan kepada pengguna ini.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableRoles.map(role => (
                    <div key={role.id} className={`flex items-start p-4 rounded-xl border ${currentRoleNames.includes(role.name) ? 'border-sky-200 bg-sky-50/50 dark:bg-sky-500/5' : 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50'} transition-colors`}>
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id={`role-${role.id}`}
                          name="roles"
                          value={role.name}
                          type="checkbox"
                          defaultChecked={currentRoleNames.includes(role.name)}
                          disabled={!isPortalAdmin}
                          className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`role-${role.id}`} className={`font-medium text-slate-900 ${!isPortalAdmin ? 'opacity-70' : ''}`}>
                          {role.name}
                        </label>
                        {role.description && (
                          <p className={`text-slate-500 mt-0.5 ${!isPortalAdmin ? 'opacity-70' : ''}`}>{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
                {isPortalAdmin && (
                  <div className="admin-form-footer">
                    <button
                      type="submit"
                      className="admin-button"
                    >
                      Simpan Perubahan Role
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
