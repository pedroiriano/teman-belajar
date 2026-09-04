"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getServerAccessToken } from "@/lib/server-auth";
import { attachMediaUsages } from "@/lib/media-usages";
import type { MediaUsageInput } from "@/components/media/types";
import type { SEOFormValue } from "@/components/seo/types";
import { saveDiscoverabilityProfileAction } from "@/app/actions/discoverability";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export async function createNewsAction(data: { title: string, slug: string, excerpt: string, body: string, seo: SEOFormValue, media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ title: data.title, slug: data.slug, excerpt: data.excerpt, body: data.body })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: err?.detail || "Failed to create news" };
  }

  const created = await res.json();
  const seoResult = await saveDiscoverabilityProfileAction("news", created.id, data.seo);
  if (!seoResult.success) return { success: false, error: "Berita tersimpan, tetapi SEO & Discovery gagal disimpan. Perbaiki sebelum publikasi.", createdId: created.id };
  const failed = await attachMediaUsages(API_BASE!, accessToken, "news", created.id, data.media_usages ?? []);
  revalidatePath("/dashboard/news");
  if (failed.length) return { success: false, error: "Berita tersimpan, tetapi sebagian relasi media gagal. Jangan terbitkan sebelum rekonsiliasi.", createdId: created.id };
  return { success: true, data: created };
}

export async function transitionNewsAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: err?.detail || "Failed to transition news status" };
  }

  revalidatePath(`/dashboard/news/${id}`);
  revalidatePath("/dashboard/news");
  return { success: true };
}

export async function updateNewsAction(id: string, data: { title: string; slug: string; excerpt: string; body: string; expected_version: number; seo: SEOFormValue; media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  if (!session || !accessToken) return { success: false, error: "Unauthorized" };
  const res = await fetch(`${API_BASE}/api/v1/admin/news/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({ title: data.title, slug: data.slug, excerpt: data.excerpt, body: data.body, expected_version: data.expected_version }),
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    return { success: false, error: problem?.detail || "Berita belum dapat diperbarui", conflict: res.status === 409 };
  }
  const updated = await res.json();
  const seoResult = await saveDiscoverabilityProfileAction("news", updated.id, data.seo);
  if (!seoResult.success) return { success: false, error: "Berita diperbarui, tetapi SEO & Discovery gagal disimpan.", data: updated };
  const failed = await attachMediaUsages(API_BASE!, accessToken, "news", updated.id, data.media_usages ?? []);
  revalidatePath(`/dashboard/news/${id}`); revalidatePath("/dashboard/news");
  if (failed.length) return { success: false, error: "Berita diperbarui, tetapi sebagian relasi media gagal. Jangan ajukan review sebelum rekonsiliasi.", data: updated };
  return { success: true, data: updated };
}

export async function createAnnouncementAction(data: { title: string, slug: string, body: string, start_at: Date | null, end_at: Date | null, seo: SEOFormValue, media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      title: data.title,
      slug: data.slug,
      body: data.body,
      start_at: data.start_at ? data.start_at.toISOString() : null,
      end_at: data.end_at ? data.end_at.toISOString() : null
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: err?.detail || "Failed to create announcement" };
  }

  const created = await res.json();
  const seoResult = await saveDiscoverabilityProfileAction("announcement", created.id, data.seo);
  if (!seoResult.success) return { success: false, error: "Pengumuman tersimpan, tetapi SEO & Discovery gagal disimpan. Perbaiki sebelum publikasi.", createdId: created.id };
  const failed = await attachMediaUsages(API_BASE!, accessToken, "announcement", created.id, data.media_usages ?? []);
  revalidatePath("/dashboard/announcements");
  if (failed.length) return { success: false, error: "Pengumuman tersimpan, tetapi sebagian relasi media gagal. Jangan terbitkan sebelum rekonsiliasi.", createdId: created.id };
  return { success: true, data: created };
}

export async function transitionAnnouncementAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: err?.detail || "Failed to transition announcement status" };
  }

  revalidatePath(`/dashboard/announcements/${id}`);
  revalidatePath("/dashboard/announcements");
  return { success: true };
}

export async function updateAnnouncementAction(id: string, data: { title: string; slug: string; body: string; start_at: Date | null; end_at: Date | null; expected_version: number; seo: SEOFormValue; media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  if (!session || !accessToken) return { success: false, error: "Unauthorized" };
  const res = await fetch(`${API_BASE}/api/v1/admin/announcements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({ title: data.title, slug: data.slug, body: data.body, start_at: data.start_at?.toISOString() ?? null, end_at: data.end_at?.toISOString() ?? null, expected_version: data.expected_version }),
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    return { success: false, error: problem?.detail || "Pengumuman belum dapat diperbarui", conflict: res.status === 409 };
  }
  const updated = await res.json();
  const seoResult = await saveDiscoverabilityProfileAction("announcement", updated.id, data.seo);
  if (!seoResult.success) return { success: false, error: "Pengumuman diperbarui, tetapi SEO & Discovery gagal disimpan.", data: updated };
  const failed = await attachMediaUsages(API_BASE!, accessToken, "announcement", updated.id, data.media_usages ?? []);
  revalidatePath(`/dashboard/announcements/${id}`); revalidatePath("/dashboard/announcements");
  if (failed.length) return { success: false, error: "Pengumuman diperbarui, tetapi sebagian relasi media gagal. Jangan ajukan review sebelum rekonsiliasi.", data: updated };
  return { success: true, data: updated };
}

export async function getAdminNewsAction() {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return { success: false, error: "Failed to fetch news", data: null };
  }

  const data = await res.json();
  return { success: true, data: data.data, roles: session.roles || [] };
}

export async function getAdminAnnouncementsAction() {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return { success: false, error: "Failed to fetch announcements", data: null };
  }

  const data = await res.json();
  return { success: true, data: data.data, roles: session.roles || [] };
}
