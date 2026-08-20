"use server";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function checkAdmin() {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    throw new Error("Forbidden");
  }
}

export async function createUserAction(formData: FormData) {
  await checkAdmin();
  
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const password = formData.get("password") as string;
  const roleNames = formData.getAll("roles") as string[];
  
  // Create user
  const createRes = await kcAdminFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      username, email, firstName, lastName,
      enabled: true, emailVerified: true,
      credentials: [{ type: "password", value: password, temporary: false }],
    }),
  });
  
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create user: ${err}`);
  }
  
  // Get created user ID from Location header
  const location = createRes.headers.get("Location") || "";
  const userId = location.split("/").pop();
  
  // Assign roles if selected
  if (userId && roleNames.length > 0) {
    const allRolesRes = await kcAdminFetch("/roles");
    const allRoles = await allRolesRes.json();
    const rolesToAssign = allRoles.filter((r: any) => roleNames.includes(r.name));
    if (rolesToAssign.length > 0) {
      await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
        method: "POST",
        body: JSON.stringify(rolesToAssign),
      });
    }
  }
  
  redirect("/dashboard/users");
}

export async function toggleUserAction(userId: string, enabled: boolean) {
  await checkAdmin();
  
  const res = await kcAdminFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update user: ${err}`);
  }
}

export async function updateUserRolesAction(userId: string, formData: FormData) {
  await checkAdmin();
  
  const selectedRoleNames = formData.getAll("roles") as string[];
  
  // Get all roles
  const allRolesRes = await kcAdminFetch("/roles");
  const allRoles = await allRolesRes.json();
  
  // Filter out internal roles to know which ones we are managing
  const internalRoles = ["uma_authorization", "offline_access"];
  const managedRoles = allRoles.filter((r: any) => !internalRoles.includes(r.name) && !r.name.startsWith("default-roles-"));
  
  // Get current roles
  const currentRolesRes = await kcAdminFetch(`/users/${userId}/role-mappings/realm`);
  const currentRoles = await currentRolesRes.json();
  const currentRoleNames = currentRoles.map((r: any) => r.name);
  
  // Determine roles to add and remove
  const rolesToAddNames = selectedRoleNames.filter(name => !currentRoleNames.includes(name));
  const rolesToRemoveNames = managedRoles
    .map((r: any) => r.name)
    .filter((name: string) => currentRoleNames.includes(name) && !selectedRoleNames.includes(name));
    
  const rolesToAdd = allRoles.filter((r: any) => rolesToAddNames.includes(r.name));
  const rolesToRemove = allRoles.filter((r: any) => rolesToRemoveNames.includes(r.name));
  
  if (rolesToAdd.length > 0) {
    await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "POST",
      body: JSON.stringify(rolesToAdd),
    });
  }
  
  if (rolesToRemove.length > 0) {
    await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
      method: "DELETE",
      body: JSON.stringify(rolesToRemove),
    });
  }
}
