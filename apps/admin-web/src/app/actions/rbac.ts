"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { rbacPolicyStore } from "@/lib/rbac/policy-store";
import { PermissionAction, RolePolicy } from "@/types/rbac";
import { revalidatePath } from "next/cache";

async function assertAdminAccess() {
  const session = await getServerSession(authOptions);
  const roles = session?.roles || [];
  const isAdmin = roles.includes("Portal Administrator") || roles.includes("Super Administrator");
  if (!isAdmin) {
    throw new Error("Akses ditolak: Anda tidak memiliki wewenang untuk mengelola peran dan izin.");
  }
  return session;
}

export async function getRolePoliciesAction(): Promise<RolePolicy[]> {
  await assertAdminAccess();
  return rbacPolicyStore.getRolePolicies();
}

export async function updateRolePolicyAction(
  roleId: string,
  permissions: Record<string, PermissionAction[]>,
  description?: string
): Promise<{ success: boolean; role?: RolePolicy; error?: string }> {
  try {
    await assertAdminAccess();
    const updated = rbacPolicyStore.updateRolePermissions(roleId, permissions, description);
    revalidatePath("/dashboard/roles");
    return { success: true, role: updated };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui izin peran." };
  }
}

export async function createCustomRoleAction(
  name: string,
  description: string,
  templateRoleId?: string
): Promise<{ success: boolean; role?: RolePolicy; error?: string }> {
  try {
    await assertAdminAccess();
    const created = rbacPolicyStore.createCustomRole(name, description, templateRoleId);
    revalidatePath("/dashboard/roles");
    return { success: true, role: created };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal membuat peran kustom baru." };
  }
}

export async function deleteCustomRoleAction(
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdminAccess();
    const deleted = rbacPolicyStore.deleteCustomRole(roleId);
    if (!deleted) {
      return { success: false, error: "Peran tidak ditemukan atau gagal dihapus." };
    }
    revalidatePath("/dashboard/roles");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus peran." };
  }
}
