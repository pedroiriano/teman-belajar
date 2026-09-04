"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { rbacPolicyStore } from "@/lib/rbac/policy-store";
import { PermissionAction, RolePolicy } from "@/types/rbac";
import { revalidatePath } from "next/cache";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function assertAdminAccess() {
  const session = await getServerSession(authOptions);
  const roles = (session as { roles?: string[] })?.roles || [];
  const isAdmin = roles.includes("Portal Administrator") || roles.includes("Super Administrator");
  if (!isAdmin) {
    throw new Error("Akses ditolak: Anda tidak memiliki wewenang untuk mengelola peran dan izin.");
  }
  return session;
}

export async function getRolePoliciesAction(): Promise<RolePolicy[]> {
  await assertAdminAccess();
  const token = await getServerAccessToken();

  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/rbac/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Safe fallback to local store
    }
  }

  return rbacPolicyStore.getRolePolicies();
}

export async function updateRolePolicyAction(
  roleId: string,
  permissions: Record<string, PermissionAction[]>,
  description?: string
): Promise<{ success: boolean; role?: RolePolicy; error?: string }> {
  try {
    await assertAdminAccess();
    const token = await getServerAccessToken();

    if (token) {
      const res = await fetch(`${API_BASE}/api/v1/admin/rbac/roles/${roleId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions, description }),
      });

      if (res.ok) {
        const updated = await res.json();
        rbacPolicyStore.updateRolePermissions(roleId, permissions, description);
        revalidatePath("/dashboard/roles");
        return { success: true, role: updated };
      }
    }

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
    const token = await getServerAccessToken();

    if (token) {
      const res = await fetch(`${API_BASE}/api/v1/admin/rbac/roles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          template_id: templateRoleId,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        revalidatePath("/dashboard/roles");
        return { success: true, role: created };
      }
    }

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
    const token = await getServerAccessToken();

    if (token) {
      const res = await fetch(`${API_BASE}/api/v1/admin/rbac/roles/${roleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || "Gagal menghapus peran dari database." };
      }
    }

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
