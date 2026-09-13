import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const types = read("src/types/banner.ts");
const bffList = read("src/app/api/bff/banners/route.ts");
const bffDetail = read("src/app/api/bff/banners/[id]/route.ts");
const bffToggle = read("src/app/api/bff/banners/[id]/toggle-active/route.ts");
const nav = read("src/lib/navigation.ts");
const workspace = read("src/components/banners/cuba-banners-workspace.tsx");
const page = read("src/app/dashboard/banners/page.tsx");
const actions = read("src/app/actions/banners.ts");

// 1. Types Verification
for (const token of [
  "HeroBanner",
  "CreateBannerPayload",
  "UpdateBannerPayload",
  "BannerAlign",
  "align",
  "sort_order",
  "is_active",
  "image_url",
]) {
  assert.ok(types.includes(token), `types/banner.ts missing token: ${token}`);
}

// 2. Navigation Verification
assert.ok(
  nav.includes('id: "banners"') &&
  nav.includes('href: "/dashboard/banners"') &&
  nav.includes('label: "Manajemen Banner"'),
  "navigation.ts missing banners menu entry"
);

// 3. BFF Verification
for (const token of ["/api/v1/admin/banners", "getServerAccessToken", "GET", "POST"]) {
  assert.ok(bffList.includes(token), `bff/banners/route.ts missing token: ${token}`);
}
for (const token of ["/api/v1/admin/banners/", "PUT", "DELETE"]) {
  assert.ok(bffDetail.includes(token), `bff/banners/[id]/route.ts missing token: ${token}`);
}
for (const token of ["/toggle-active", "PATCH"]) {
  assert.ok(bffToggle.includes(token), `bff/banners/[id]/toggle-active/route.ts missing token: ${token}`);
}

// 4. Server Actions Verification
for (const token of [
  "getAdminBannersAction",
  "createAdminBannerAction",
  "updateAdminBannerAction",
  "toggleAdminBannerActiveAction",
  "deleteAdminBannerAction",
]) {
  assert.ok(actions.includes(token), `actions/banners.ts missing token: ${token}`);
}

// 5. Cuba Workspace Verification
for (const token of [
  "CubaBannersWorkspace",
  "AdminDataTable",
  "activeBannersCount",
  "Maksimal 3 banner yang dapat aktif",
  "Tambah Banner",
  "Edit Hero Banner",
  "Pratinjau Gambar",
  "MediaPicker",
  "Pustaka Media",
  'role="dialog"',
  'aria-modal="true"',
  "currentTarget",
  "role=\"switch\"",
  "handleToggleActive",
  "handleConfirmDelete",
]) {
  assert.ok(workspace.includes(token), `cuba-banners-workspace.tsx missing token: ${token}`);
}

// 6. Dashboard Page Verification
for (const token of [
  "BannersPage",
  "Manajemen Banner Beranda",
  "CubaBannersWorkspace",
  "getServerSession",
]) {
  assert.ok(page.includes(token), `dashboard/banners/page.tsx missing token: ${token}`);
}

console.log("verify-banners-contract: all assertions passed.");
