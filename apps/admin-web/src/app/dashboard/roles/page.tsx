import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { rbacPolicyStore } from "@/lib/rbac/policy-store";
import { CubaRbacManager } from "@/components/rbac/cuba-rbac-manager";

export default async function RolesManagementPage() {
  const session = await getServerSession(authOptions);
  const roles = session?.roles || [];
  const isAdmin = roles.includes("Portal Administrator") || roles.includes("Super Administrator");

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const rolePolicies = rbacPolicyStore.getRolePolicies();

  return (
    <div className="admin-page space-y-8">
      {/* Header */}
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">OTORISASI GRANULAR</p>
          <h1 className="admin-page-title">Peran & Izin Akses</h1>
          <p className="admin-page-copy">
            Kelola peran sistem dan peran kustom, tetapkan matriks hak akses granular per modul, dan simulasikan kebijakan keamanan.
          </p>
        </div>
      </header>

      {/* RBAC Manager */}
      <CubaRbacManager initialRoles={rolePolicies} />
    </div>
  );
}
