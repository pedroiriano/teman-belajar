"use server";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isProductRole, KeycloakRole, PRODUCT_ROLES, ProductRole } from "@/types/user";
import { revalidatePath } from "next/cache";

const MANAGED_ROLE_ALLOWLIST: readonly ProductRole[] = PRODUCT_ROLES;

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    throw new Error("Forbidden: User Management requires Portal Administrator role.");
  }
  return session;
}

function safeAudit(action: string, actor: string, target: string, details: Record<string, unknown> = {}) {
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

function requiredString(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key);
  if (typeof value !== "string") throw new Error(`Invalid ${key}.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`Invalid ${key}.`);
  return normalized;
}

function requestedRoles(formData: FormData): ProductRole[] {
  return formData.getAll("roles").map((value) => {
    if (typeof value !== "string" || !isProductRole(value)) {
      throw new Error("Invalid role assignment attempted.");
    }
    return value;
  });
}

function validatedUserId(userId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid user identifier.");
  return userId;
}

export async function createUserAction(formData: FormData) {
  const session = await checkAdmin();
  const actor = session.actorId || "unknown";

  const username = requiredString(formData, "username", 255);
  const email = requiredString(formData, "email", 320);
  const firstName = requiredString(formData, "firstName", 255);
  const lastName = requiredString(formData, "lastName", 255);
  const password = requiredString(formData, "password", 1024);
  const roleNames = requestedRoles(formData);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email.");
  if (!/^[A-Za-z0-9._@-]+$/.test(username)) throw new Error("Invalid username.");
  if (password.length < 8) throw new Error("Temporary password must contain at least 8 characters.");
  
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
  
  safeAudit("user.created", actor, userId);
  
  if (userId && userId !== "unknown" && roleNames.length > 0) {
    const availableRolesRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm/available`);
    if (!availableRolesRes.ok) throw new Error("Failed to load assignable product roles.");
    const availableRoles = (await availableRolesRes.json()) as KeycloakRole[];
    const rolesToAssign = availableRoles.filter((role) => isProductRole(role.name) && roleNames.includes(role.name));
    if (rolesToAssign.length !== roleNames.length) {
      throw new Error("One or more requested product roles are unavailable.");
    }
    if (rolesToAssign.length > 0) {
      const assignRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
        method: "POST",
        body: JSON.stringify(rolesToAssign),
      });
      if (!assignRes.ok) throw new Error("Failed to assign product roles.");
      safeAudit("role.assigned", actor, userId, { roles: roleNames });
    }
  }
  
  redirect("/dashboard/users");
}

export async function toggleUserAction(userId: string, enabled: boolean) {
  const session = await checkAdmin();
  const actor = session.actorId || "unknown";
  validatedUserId(userId);
  
  const res = await kcAdminFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update user status. Status: ${res.status}`);
  }
  
  safeAudit(enabled ? "user.enabled" : "user.disabled", actor, userId);
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
}

export async function updateUserProfileAction(userId: string, formData: FormData) {
  const session = await checkAdmin();
  const actor = session.actorId || "unknown";
  validatedUserId(userId);

  const firstName = requiredString(formData, "firstName", 255);
  const lastName = requiredString(formData, "lastName", 255);
  const email = requiredString(formData, "email", 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email.");

  const res = await kcAdminFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ firstName, lastName, email }),
  });
  if (!res.ok) throw new Error(`Failed to update user profile. Status: ${res.status}`);

  safeAudit("user.profile_updated", actor, userId, { fields: ["firstName", "lastName", "email"] });
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
}

export async function updateUserRolesAction(userId: string, formData: FormData) {
  const session = await checkAdmin();
  const actor = session.actorId || "unknown";
  validatedUserId(userId);

  const selectedRoleNames = requestedRoles(formData);
  
  const currentRolesRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm`);
  if (!currentRolesRes.ok) throw new Error("Failed to load current user roles.");
  const currentRoles = (await currentRolesRes.json()) as KeycloakRole[];
  const availableRolesRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm/available`);
  if (!availableRolesRes.ok) throw new Error("Failed to load assignable product roles.");
  const availableRoles = (await availableRolesRes.json()) as KeycloakRole[];
  const currentRoleNames = currentRoles.map((role) => role.name);
  
  const rolesToAddNames = selectedRoleNames.filter(name => !currentRoleNames.includes(name));
  const rolesToRemoveNames = MANAGED_ROLE_ALLOWLIST.filter(name => currentRoleNames.includes(name) && !selectedRoleNames.includes(name));
    
  const rolesToAdd = availableRoles.filter((role) => isProductRole(role.name) && rolesToAddNames.includes(role.name));
  const rolesToRemove = currentRoles.filter((role) => isProductRole(role.name) && rolesToRemoveNames.includes(role.name));
  if (rolesToAdd.length !== rolesToAddNames.length || rolesToRemove.length !== rolesToRemoveNames.length) {
    throw new Error("One or more requested product roles are unavailable.");
  }
  
  if (rolesToAdd.length > 0) {
    const res = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "POST",
      body: JSON.stringify(rolesToAdd),
    });
    if (!res.ok) throw new Error("Failed to assign product roles.");
    safeAudit("role.assigned", actor, userId, { roles: rolesToAddNames });
  }
  
  if (rolesToRemove.length > 0) {
    const res = await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "DELETE",
      body: JSON.stringify(rolesToRemove),
    });
    if (!res.ok) throw new Error("Failed to remove product roles.");
    safeAudit("role.removed", actor, userId, { roles: rolesToRemoveNames });
  }

  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard/users");
}
