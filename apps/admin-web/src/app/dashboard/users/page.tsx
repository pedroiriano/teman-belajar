import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import Link from "next/link";
import type { KeycloakUser } from "@/types/user";
import { AdminDataTable } from "@/components/admin-data-table";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const roles = session?.roles || [];
  const hasAccess = roles.some((role: string) => ["Portal Administrator", "Content Editor", "Reviewer"].includes(role));
  const isPortalAdmin = roles.includes("Portal Administrator");

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const res = await kcAdminFetch("/users?max=100");
  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }
  const users: KeycloakUser[] = await res.json();

  const headerActions = isPortalAdmin ? (
    <Link
      href="/dashboard/users/create"
      className="admin-button !min-h-9 !py-1 !px-3 !text-xs"
    >
      <span aria-hidden="true">+</span> Tambah pengguna
    </Link>
  ) : undefined;

  return (
    <div className="admin-page space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-kicker">Platform</p>
          <h1 className="admin-page-title">Manajemen Pengguna</h1>
          <p className="admin-page-copy">
            Kelola akun, peran otorisasi, dan kredensial pengguna platform Teman Belajar.
          </p>
        </div>
      </div>

      <AdminDataTable
        title="Daftar pengguna"
        description="Akun dan profil pengguna terdaftar dalam sistem IAM"
        itemCount={users.length}
        headers={[
          { label: "Nama", key: "name" },
          { label: "Nama Pengguna", key: "username" },
          { label: "Email", key: "email" },
          { label: "Status", key: "status" },
          { label: "Dibuat pada", key: "created_at" },
          { label: "Aksi", key: "actions" },
        ]}
        emptyState="Belum ada pengguna terdaftar."
        actions={headerActions}
      >
        {users.map((user) => (
          <tr
            key={user.id}
            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
          >
            <td className="p-4" data-label="Nama">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || "-"}
              </div>
            </td>
            <td className="p-4" data-label="Nama Pengguna">
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                {user.username}
              </div>
            </td>
            <td className="p-4 text-xs text-slate-600 dark:text-slate-400" data-label="Email">
              {user.email || "-"}
            </td>
            <td className="p-4" data-label="Status">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  user.enabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                }`}
              >
                {user.enabled ? "Aktif" : "Nonaktif"}
              </span>
            </td>
            <td
              className="p-4 text-xs text-slate-600 dark:text-slate-400"
              data-label="Dibuat pada"
            >
              {user.createdTimestamp ? new Date(user.createdTimestamp).toLocaleDateString("id-ID") : "-"}
            </td>
            <td className="p-4 text-xs font-semibold" data-label="Aksi">
              <Link
                href={`/dashboard/users/${user.id}`}
                className="font-bold text-sky-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                Buka detail <span aria-hidden="true">→</span>
              </Link>
            </td>
          </tr>
        ))}
      </AdminDataTable>
    </div>
  );
}
