import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const types = read("src/types/rbac.ts");
const store = read("src/lib/rbac/policy-store.ts");
const actions = read("src/app/actions/rbac.ts");
const manager = read("src/components/rbac/cuba-rbac-manager.tsx");
const modal = read("src/components/rbac/cuba-create-role-modal.tsx");
const page = read("src/app/dashboard/roles/page.tsx");
const nav = read("src/lib/navigation.ts");

// 1. Types Contract
for (const token of [
  "PermissionAction",
  "PLATFORM_MODULES",
  "RolePolicy",
  "RbacOverviewKPI",
  "read",
  "create",
  "edit",
  "review",
  "publish",
  "delete",
]) {
  assert.ok(types.includes(token), `rbac.ts missing token: ${token}`);
}

// 2. Policy Store Contract
for (const token of [
  "RbacPolicyStore",
  "CANONICAL_ROLE_DEFAULTS",
  "getRolePolicies",
  "updateRolePermissions",
  "createCustomRole",
  "deleteCustomRole",
  "super-administrator",
  "portal-administrator",
  "content-editor",
  "reviewer",
  "course-manager",
]) {
  assert.ok(store.includes(token), `policy-store.ts missing token: ${token}`);
}

// 3. Server Actions Contract
for (const token of [
  "getRolePoliciesAction",
  "updateRolePolicyAction",
  "createCustomRoleAction",
  "deleteCustomRoleAction",
]) {
  assert.ok(actions.includes(token), `actions/rbac.ts missing token: ${token}`);
}

// 4. UI RBAC Manager Contract
for (const token of [
  "CubaRbacManager",
  "Daftar Peran",
  "Matriks Izin Granular",
  "Simulator Kebijakan",
  "handleTogglePermission",
  "handleSavePermissions",
  "handleDeleteRole",
]) {
  assert.ok(manager.includes(token), `cuba-rbac-manager.tsx missing token: ${token}`);
}

// 5. Create Role Modal Contract
for (const token of [
  "CubaCreateRoleModal",
  "createCustomRoleAction",
  "Nama Peran",
  "Salin Hak Akses Awal Dari Template",
]) {
  assert.ok(modal.includes(token), `cuba-create-role-modal.tsx missing token: ${token}`);
}

// 6. Page Route Contract
for (const token of [
  "RolesManagementPage",
  "CubaRbacManager",
  "OTORISASI GRANULAR",
  "Peran & Izin Akses",
]) {
  assert.ok(page.includes(token), `roles/page.tsx missing token: ${token}`);
}

// 7. Navigation Integration Contract
for (const token of [
  "id: \"roles\"",
  "href: \"/dashboard/roles\"",
  "Peran & Izin Akses",
]) {
  assert.ok(nav.includes(token), `navigation.ts missing token: ${token}`);
}

console.log("verify-rbac-contract: PASS (all checks passed)");
