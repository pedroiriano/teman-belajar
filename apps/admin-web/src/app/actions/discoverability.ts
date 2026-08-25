"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type { SEOFormValue, TaxonomyTerm } from "@/components/seo/types";

const apiBase = process.env.PORTAL_API_INTERNAL_URL;

async function request(path: string, init?: RequestInit) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  if (!session || !accessToken) return { success: false as const, error: "Unauthorized" };
  if (!apiBase) return { success: false as const, error: "Portal API is not configured" };
  try {
    const response = await fetch(`${apiBase}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) }, cache: "no-store" });
    if (!response.ok) { const problem = await response.json().catch(() => ({})); return { success: false as const, error: problem.detail || problem.title || `Error ${response.status}`, status: response.status }; }
    if (response.status === 204) return { success: true as const };
    return { success: true as const, data: await response.json(), roles: session.roles || [] };
  } catch { return { success: false as const, error: "Failed to communicate with API" }; }
}

export async function getTaxonomyAction(includeArchived = false) {
  const [categories, tags] = await Promise.all([
    request(`/api/v1/admin/taxonomy/categories?include_archived=${includeArchived}`),
    request(`/api/v1/admin/taxonomy/tags?include_archived=${includeArchived}`),
  ]);
  if (!categories.success) return categories;
  if (!tags.success) return tags;
  return { success: true as const, data: { categories: categories.data.data as TaxonomyTerm[], tags: tags.data.data as TaxonomyTerm[] }, roles: categories.roles || [] };
}

export async function createTaxonomyTermAction(kind: "categories" | "tags", input: { name: string; slug: string; description: string }) {
  const result = await request(`/api/v1/admin/taxonomy/${kind}`, { method: "POST", body: JSON.stringify(input) });
  if (result.success) revalidatePath("/dashboard/taxonomy");
  return result;
}

export async function archiveTaxonomyTermAction(kind: "categories" | "tags", id: string) {
  const result = await request(`/api/v1/admin/taxonomy/${kind}/${encodeURIComponent(id)}/archive`, { method: "POST" });
  if (result.success) revalidatePath("/dashboard/taxonomy");
  return result;
}

export async function getDiscoverabilityProfileAction(contentType: string, contentId: string) {
  return request(`/api/v1/admin/discoverability/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`);
}

export async function saveDiscoverabilityProfileAction(contentType: string, contentId: string, value: SEOFormValue) {
  const { social_image_alt: _derivedSocialImageAlt, ...persisted } = value;
  const result = await request(`/api/v1/admin/discoverability/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`, {
    method: "PUT",
    body: JSON.stringify({ ...persisted, indexable: value.indexable === "true", canonical_path: value.canonical_path || null }),
  });
  if (result.success) {
    const segment = contentType === "announcement" ? "announcements" : contentType;
    revalidatePath(`/dashboard/${segment}/${contentId}`);
    revalidatePath(`/${segment}`);
  }
  return result;
}
