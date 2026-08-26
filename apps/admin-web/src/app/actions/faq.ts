"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { attachMediaUsages, detachMediaUsage } from "@/lib/media-usages";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
if (!API_BASE) throw new Error("Missing required environment variable: PORTAL_API_INTERNAL_URL");

export type FAQCategory = { id: string; slug: string; name: string; description: string; sort_order: number; status: "active" | "archived" };
export type FAQItem = { id: string; category_id: string; category_name: string; category_slug: string; slug: string; question: string; answer: string; sort_order: number; status: "draft" | "in_review" | "approved" | "published" | "archived"; media_asset_id?: string; media_alt?: string; seo_title: string; meta_description: string; indexable: boolean; version: number; updated_at: string };
export type FAQInput = { category_id: string; slug: string; question: string; answer: string; sort_order: number; media_asset_id: string | null; media_alt: string | null; seo_title: string; meta_description: string; indexable: boolean; expected_version?: number };
export type FAQPagination = { page: number; page_size: number; total: number; total_pages: number };

async function identity() {
  const session: any = await getServerSession(authOptions);
  const token = await getServerAccessToken();
  return { session, token };
}

async function problem(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.detail || fallback;
}

export async function getFAQWorkspaceAction(filter: { q?: string; status?: string; categoryId?: string; page?: number; pageSize?: number } = {}) {
  const { session, token } = await identity();
  const emptyPagination: FAQPagination = { page: 1, page_size: 20, total: 0, total_pages: 0 };
  if (!session || !token) return { success: false as const, error: "Sesi tidak sah", categories: [], items: [], pagination: emptyPagination, roles: [] };
  const headers = { Authorization: `Bearer ${token}` };
  const itemQuery = new URLSearchParams({
    q: (filter.q || "").slice(0, 200),
    status: filter.status || "all",
    category_id: filter.categoryId || "",
    page: String(Math.max(1, filter.page || 1)),
    page_size: String([10, 20, 50].includes(filter.pageSize || 20) ? filter.pageSize : 20),
  });
  const [categoriesResponse, itemsResponse] = await Promise.all([
    fetch(`${API_BASE}/api/v1/admin/faqs/categories?include_archived=true`, { headers, cache: "no-store" }),
    fetch(`${API_BASE}/api/v1/admin/faqs/items?${itemQuery}`, { headers, cache: "no-store" }),
  ]);
  if (!categoriesResponse.ok || !itemsResponse.ok) return { success: false as const, error: "FAQ belum dapat dimuat", categories: [], items: [], pagination: emptyPagination, roles: session.roles || [] };
  const categories = await categoriesResponse.json(); const items = await itemsResponse.json();
  return { success: true as const, categories: (categories.data || []) as FAQCategory[], items: (items.data || []) as FAQItem[], pagination: items.pagination as FAQPagination, roles: (session.roles || []) as string[] };
}

export async function createFAQCategoryAction(input: { name: string; slug: string; description: string; sort_order: number }) {
  const { session, token } = await identity(); if (!session || !token) return { success: false, error: "Unauthorized" };
  const response = await fetch(`${API_BASE}/api/v1/admin/faqs/categories`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  if (!response.ok) return { success: false, error: await problem(response, "Kategori FAQ belum dapat dibuat") };
  revalidatePath("/dashboard/faqs"); return { success: true };
}

export async function archiveFAQCategoryAction(id: string) {
  const { session, token } = await identity(); if (!session || !token) return { success: false, error: "Unauthorized" };
  const response = await fetch(`${API_BASE}/api/v1/admin/faqs/categories/${id}/archive`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return { success: false, error: await problem(response, "Kategori FAQ belum dapat diarsipkan") };
  revalidatePath("/dashboard/faqs"); return { success: true };
}

export async function createFAQAction(input: FAQInput) {
  const { session, token } = await identity(); if (!session || !token) return { success: false, error: "Unauthorized" };
  const response = await fetch(`${API_BASE}/api/v1/admin/faqs/items`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
  if (!response.ok) return { success: false, error: await problem(response, "FAQ belum dapat dibuat") };
  const item = await response.json() as FAQItem;
  if (input.media_asset_id) {
    const failed = await attachMediaUsages(API_BASE!, token, "faq_item", item.id, [{ media_id: input.media_asset_id, usage_role: "inline", sort_order: 0 }]);
    if (failed.length) return { success: false, error: "FAQ tersimpan, tetapi relasi Media gagal. Jangan ajukan review sebelum diperbaiki.", data: item };
  }
  revalidatePath("/dashboard/faqs"); return { success: true, data: item };
}

export async function updateFAQAction(id: string, input: FAQInput) {
  const { session, token } = await identity(); if (!session || !token) return { success: false, error: "Unauthorized" };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const currentResponse = await fetch(`${API_BASE}/api/v1/admin/faqs/items/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!currentResponse.ok) return { success: false, error: "FAQ saat ini belum dapat dimuat" };
  const current = await currentResponse.json() as FAQItem;
  const response = await fetch(`${API_BASE}/api/v1/admin/faqs/items/${id}`, { method: "PATCH", headers, body: JSON.stringify(input) });
  if (!response.ok) return { success: false, error: await problem(response, "FAQ belum dapat diperbarui"), conflict: response.status === 409 };
  const item = await response.json() as FAQItem;
  if (current.media_asset_id && current.media_asset_id !== input.media_asset_id) {
    const detached = await detachMediaUsage(API_BASE!, token, "faq_item", id, current.media_asset_id, "inline");
    if (!detached) return { success: false, error: "FAQ diperbarui, tetapi relasi Media lama belum dapat dilepas.", data: item };
  }
  if (input.media_asset_id && current.media_asset_id !== input.media_asset_id) {
    const failed = await attachMediaUsages(API_BASE!, token, "faq_item", id, [{ media_id: input.media_asset_id, usage_role: "inline", sort_order: 0 }]);
    if (failed.length) return { success: false, error: "FAQ diperbarui, tetapi Media baru belum dapat ditautkan.", data: item };
  }
  revalidatePath("/dashboard/faqs"); return { success: true, data: item };
}

export async function transitionFAQAction(id: string, status: FAQItem["status"]) {
  const { session, token } = await identity(); if (!session || !token) return { success: false, error: "Unauthorized" };
  const response = await fetch(`${API_BASE}/api/v1/admin/faqs/items/${id}/transition`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
  if (!response.ok) return { success: false, error: await problem(response, "Status FAQ belum dapat diubah") };
  revalidatePath("/dashboard/faqs"); return { success: true };
}
