"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { attachMediaUsages } from "@/lib/media-usages";
import type { MediaUsageInput } from "@/components/media/types";

export async function createKnowledgeAction(data: { title: string; slug: string; summary: string; body: string; media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        body: data.body
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || errData.title || `Error ${res.status}` };
    }

    const created = await res.json();
    const failed = await attachMediaUsages(API_BASE!, accessToken, "knowledge_revision", created.current_revision_id, data.media_usages ?? []);
    if (failed.length) return { success: false, error: "Artikel tersimpan, tetapi sebagian relasi media gagal. Jangan terbitkan sebelum rekonsiliasi.", createdId: created.id };
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}

export async function createKnowledgeRevisionAction(id: string, data: { body: string; media_usages?: MediaUsageInput[] }) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge/${id}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        body: data.body,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || errData.title || `Error ${res.status}` };
    }

    const created = await res.json();
    const failed = await attachMediaUsages(API_BASE!, accessToken, "knowledge_revision", created.id, data.media_usages ?? []);
    if (failed.length) return { success: false, error: "Revisi tersimpan, tetapi sebagian relasi media gagal. Jangan terbitkan sebelum rekonsiliasi.", createdId: created.id };
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}

export async function transitionKnowledgeAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge/${id}/transition`, {
      method: "POST", // we used POST in main.go
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || errData.title || `Error ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}
export async function getAdminKnowledgeAction() {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  
  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch knowledge" };
    }

    const data = await res.json();
    return { success: true, data: data.data || [], roles: session.roles || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}

export async function getAdminKnowledgeDetailAction(id: string) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;

  if (!session || !accessToken) {
    return { success: false, error: "Unauthorized" };
  }
  if (!API_BASE) {
    return { success: false, error: "Portal API is not configured" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge/${id}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { success: false, error: res.status === 404 ? "Knowledge article not found" : "Failed to fetch knowledge article" };
    }
    return { success: true, data: await res.json(), roles: session.roles || [] };
  } catch {
    return { success: false, error: "Failed to communicate with API" };
  }
}
