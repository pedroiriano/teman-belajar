import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import Link from "next/link";
import { KeycloakUser } from "@/types/user";
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

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">PLATFORM</p>
            <h1 className="admin-page-title">Manajemen Pengguna</h1>
            <p className="admin-page-copy">Kelola akun dan role pengguna platform.</p>
          </div>
          {isPortalAdmin && (
            <Link 
              href="/dashboard/users/create" 
              className="admin-button"
            >
              <span aria-hidden="true" className="mr-1">+</span> Tambah pengguna
            </Link>
          )}
        </div>

        <AdminDataTable
          title="Daftar pengguna"
          description="Akun terdaftar dalam sistem"
          itemCount={users.length}
          headers={["Nama", "Nama Pengguna", "Email", "Status", "Dibuat pada", "Aksi"]}
          emptyState="Belum ada pengguna."
        >
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 whitespace-nowrap">
                <div className="font-medium text-slate-900">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "-"}
                </div>
              </td>
              <td className="p-4 whitespace-nowrap">
                <div className="text-sm text-slate-600">{user.username}</div>
              </td>
              <td className="p-4 whitespace-nowrap">
                <div className="text-sm text-slate-600">{user.email || "-"}</div>
              </td>
              <td className="p-4 whitespace-nowrap">
                <span className={`admin-status ${
                  user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-50 text-rose-700'
                }`}>
                  {user.enabled ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="p-4 whitespace-nowrap text-sm text-slate-600">
                {user.createdTimestamp ? new Date(user.createdTimestamp).toLocaleDateString("id-ID") : "-"}
              </td>
              <td className="p-4 text-sm">
                <Link href={`/dashboard/users/${user.id}`} className="mr-4 font-bold text-sky-700 hover:text-sky-600">
                  Buka detail →
                </Link>
              </td>
            </tr>
          ))}
        </AdminDataTable>
      </div>
    </div>
  );
}
