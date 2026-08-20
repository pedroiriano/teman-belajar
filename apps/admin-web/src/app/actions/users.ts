"use server";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const MANAGED_ROLE_ALLOWLIST = [
  "Guest",
  "Learner",
  "Instructor",
  "Content Editor",
  "Reviewer",
  "Course Manager",
  "Portal Administrator",
  "LMS Administrator",
  "Auditor",
  "Super Administrator"
];

async function checkAdmin() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    throw new Error("Forbidden: User Management requires Portal Administrator role.");
  }
  return session;
}

function safeAudit(action: string, actor: string, target: string, details: any = {}) {
  console.log(JSON.stringify({
    audit: true,
    action,
    actor,
    target,
    timestamp: new Date().toISOString(),
    outcome: "success",
    ...details
  }));
}

export async function createUserAction(formData: FormData) {
  const session = await checkAdmin();
  const actor = session.user?.email || "unknown";
  
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const password = formData.get("password") as string;
  const roleNames = formData.getAll("roles") as string[];
  
  for (const r of roleNames) {
    if (!MANAGED_ROLE_ALLOWLIST.includes(r)) {
      throw new Error("Invalid role assignment attempted.");
    }
  }
  
  const createRes = await kcAdminFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      username, email, firstName, lastName,
      enabled: true, emailVerified: false,
      credentials: [{ type: "password", value: password, temporary: true }],
    }),
  });
  
  if (!createRes.ok) {
    throw new Error(`Failed to create user. Status: ${createRes.status}`);
  }
  
  const location = createRes.headers.get("Location") || "";
  const userId = location.split("/").pop() || "unknown";
  
  safeAudit("user.created", actor, userId, { username });
  
  if (userId && userId !== "unknown" && roleNames.length > 0) {
    const allRolesRes = await kcAdminFetch("/roles");
    const allRoles = await allRolesRes.json();
    const rolesToAssign = allRoles.filter((r: any) => roleNames.includes(r.name));
    if (rolesToAssign.length > 0) {
      const assignRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
        method: "POST",
        body: JSON.stringify(rolesToAssign),
      });
      if (assignRes.ok) {
        safeAudit("role.assigned", actor, userId, { roles: roleNames });
      }
    }
  }
  
  redirect("/dashboard/users");
}

export async function toggleUserAction(userId: string, enabled: boolean) {
  const session = await checkAdmin();
  const actor = session.user?.email || "unknown";
  
  const res = await kcAdminFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update user status. Status: ${res.status}`);
  }
  
  safeAudit(enabled ? "user.enabled" : "user.disabled", actor, userId);
}

export async function updateUserRolesAction(userId: string, formData: FormData) {
  const session = await checkAdmin();
  const actor = session.user?.email || "unknown";
  
  const selectedRoleNames = formData.getAll("roles") as string[];
  
  for (const r of selectedRoleNames) {
    if (!MANAGED_ROLE_ALLOWLIST.includes(r)) {
      throw new Error("Invalid role assignment attempted.");
    }
  }
  
  const allRolesRes = await kcAdminFetch("/roles");
  const allRoles = await allRolesRes.json();
  
  const currentRolesRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm`);
  const currentRoles = await currentRolesRes.json();
  const currentRoleNames = currentRoles.map((r: any) => r.name);
  
  const rolesToAddNames = selectedRoleNames.filter(name => !currentRoleNames.includes(name));
  const rolesToRemoveNames = MANAGED_ROLE_ALLOWLIST.filter(name => currentRoleNames.includes(name) && !selectedRoleNames.includes(name));
    
  const rolesToAdd = allRoles.filter((r: any) => rolesToAddNames.includes(r.name));
  const rolesToRemove = allRoles.filter((r: any) => rolesToRemoveNames.includes(r.name));
  
  if (rolesToAdd.length > 0) {
    const res = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "POST",
      body: JSON.stringify(rolesToAdd),
    });
    if (res.ok) safeAudit("role.assigned", actor, userId, { roles: rolesToAddNames });
  }
  
  if (rolesToRemove.length > 0) {
    const res = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "DELETE",
      body: JSON.stringify(rolesToRemove),
    });
    if (res.ok) safeAudit("role.removed", actor, userId, { roles: rolesToRemoveNames });
  }
}
