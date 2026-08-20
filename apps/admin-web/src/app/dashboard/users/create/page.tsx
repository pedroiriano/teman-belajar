import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { createUserAction } from "@/app/actions/users";
import Link from "next/link";
import { KeycloakRole } from "@/types/user";

export default async function CreateUserPage() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    redirect("/dashboard");
  }

  const rolesRes = await kcAdminFetch("/roles");
  const allRoles: KeycloakRole[] = await rolesRes.json();
  
  const internalRoles = ["uma_authorization", "offline_access"];
  const availableRoles = allRoles.filter((r) => !internalRoles.includes(r.name) && !r.name.startsWith("default-roles-"));

  return (
    <div className="admin-page">
      <div>
        <div className="admin-page-header">
          <div>
            <p className="admin-kicker">MANAJEMEN PENGGUNA</p>
            <h1 className="admin-page-title">Tambah Pengguna Baru</h1>
            <p className="admin-page-copy">Buat kredensial akun baru dan konfigurasi hak akses.</p>
          </div>
        </div>

        <div className="admin-form-card">
          <div className="admin-form-header">
            <h2 className="font-black text-slate-900">Informasi Pengguna</h2>
          </div>
          <form action={createUserAction}>
            <div className="admin-form-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Nama Depan *</label>
                  <input type="text" name="firstName" required className="admin-input" placeholder="Masukkan nama depan" />
                </div>
                <div>
                  <label className="admin-label">Nama Belakang *</label>
                  <input type="text" name="lastName" required className="admin-input" placeholder="Masukkan nama belakang" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="admin-label">Email *</label>
                  <input type="email" name="email" required className="admin-input" placeholder="contoh@temanbelajar.local" />
                </div>
                <div>
                  <label className="admin-label">Username *</label>
                  <input type="text" name="username" required className="admin-input" placeholder="Masukkan username unik" />
                </div>
              </div>

              <div>
                <label className="admin-label">Password Sementara *</label>
                <input type="password" name="password" required className="admin-input max-w-md" placeholder="Minimal 8 karakter" />
              </div>
              
              <div className="pt-2">
                <label className="admin-label">Role Platform</label>
                <p className="text-sm text-slate-500 mb-3">Pilih satu atau lebih hak akses untuk pengguna ini.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableRoles.map(role => (
                    <div key={role.id} className="flex items-start p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50 hover:border-sky-200 hover:bg-sky-50/50 transition-colors">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id={`role-${role.id}`}
                          name="roles"
                          value={role.name}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`role-${role.id}`} className="font-medium text-slate-900">
                          {role.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="admin-form-footer">
              <Link 
                href="/dashboard/users"
                className="admin-button-secondary"
              >
                Batal
              </Link>
              <button
                type="submit"
                className="admin-button"
              >
                Simpan Pengguna
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
