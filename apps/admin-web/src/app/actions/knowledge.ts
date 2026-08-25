"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { attachMediaUsages } from "@/lib/media-usages";
import type { MediaUsageInput } from "@/components/media/types";
import type { KnowledgeHierarchyResponse, KnowledgeNodeInput, KnowledgeNodeType } from "@/types/knowledge-hierarchy";
import type { SEOFormValue } from "@/components/seo/types";
import { saveDiscoverabilityProfileAction } from "@/app/actions/discoverability";

async function knowledgeHierarchyRequest(path: string, init?: RequestInit) {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!session || !accessToken) return { success: false as const, error: "Unauthorized" };
  if (!apiBase) return { success: false as const, error: "Portal API is not configured" };
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      return { success: false as const, error: problem.detail || problem.title || `Error ${response.status}`, status: response.status };
    }
    if (response.status === 204) return { success: true as const };
    return { success: true as const, data: await response.json(), roles: session.roles || [] };
  } catch {
    return { success: false as const, error: "Failed to communicate with API" };
  }
}

export async function getKnowledgeHierarchyAction(includeArchived = true) {
  return knowledgeHierarchyRequest(`/api/v1/admin/knowledge-hierarchy/nodes?include_archived=${includeArchived ? "true" : "false"}`) as Promise<{ success: true; data: KnowledgeHierarchyResponse; roles: string[] } | { success: false; error: string; status?: number }>;
}

export async function createKnowledgeNodeAction(input: KnowledgeNodeInput) {
  return knowledgeHierarchyRequest("/api/v1/admin/knowledge-hierarchy/nodes", { method: "POST", body: JSON.stringify(input) });
}

export async function updateKnowledgeNodeAction(id: string, input: Omit<KnowledgeNodeInput, "parent_id" | "sort_order"> & { type: KnowledgeNodeType; version: number }) {
  return knowledgeHierarchyRequest(`/api/v1/admin/knowledge-hierarchy/nodes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function moveKnowledgeNodeAction(id: string, input: { parent_id: string | null; sort_order: number; version: number }) {
  return knowledgeHierarchyRequest(`/api/v1/admin/knowledge-hierarchy/nodes/${encodeURIComponent(id)}/move`, { method: "POST", body: JSON.stringify(input) });
}

export async function reorderKnowledgeNodesAction(parentId: string | null, orderedIds: string[]) {
  return knowledgeHierarchyRequest("/api/v1/admin/knowledge-hierarchy/nodes/reorder", { method: "POST", body: JSON.stringify({ parent_id: parentId, ordered_ids: orderedIds }) });
}

export async function archiveKnowledgeNodeAction(id: string, version: number) {
  return knowledgeHierarchyRequest(`/api/v1/admin/knowledge-hierarchy/nodes/${encodeURIComponent(id)}/archive`, { method: "POST", body: JSON.stringify({ version }) });
}

export async function assignKnowledgeArticleNodeAction(articleId: string, nodeId: string) {
  return knowledgeHierarchyRequest(`/api/v1/admin/knowledge/${encodeURIComponent(articleId)}/primary-node`, { method: "PUT", body: JSON.stringify({ node_id: nodeId }) });
}

export async function createKnowledgeAction(data: { title: string; slug: string; summary: string; body: string; seo: SEOFormValue; primary_node_id?: string; media_usages?: MediaUsageInput[] }) {
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
	const seoResult = await saveDiscoverabilityProfileAction("knowledge", created.id, data.seo);
	if (!seoResult.success) return { success: false, error: "Artikel tersimpan, tetapi SEO & Discovery gagal disimpan. Perbaiki sebelum publikasi.", createdId: created.id };
	if (data.primary_node_id) {
	  const assignment = await assignKnowledgeArticleNodeAction(created.id, data.primary_node_id);
	  if (!assignment.success) return { success: false, error: "Artikel tersimpan, tetapi struktur pengetahuan gagal ditetapkan. Periksa konflik hierarchy sebelum melanjutkan.", createdId: created.id };
	}
    const failed = await attachMediaUsages(API_BASE!, accessToken, "knowledge_revision", created.current_revision_id, data.media_usages ?? []);
    if (failed.length) return { success: false, error: "Artikel tersimpan, tetapi sebagian relasi media gagal. Jangan terbitkan sebelum rekonsiliasi.", createdId: created.id };
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}

export async function createKnowledgeRevisionAction(id: string, data: { body: string; expected_revision_no: number; seo: SEOFormValue; primary_node_id?: string; media_usages?: MediaUsageInput[] }) {
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
        expected_revision_no: data.expected_revision_no,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || errData.title || `Error ${res.status}` };
    }

    const created = await res.json();
	const seoResult = await saveDiscoverabilityProfileAction("knowledge", id, data.seo);
	if (!seoResult.success) return { success: false, error: "Revisi tersimpan, tetapi SEO & Discovery gagal disimpan.", createdId: created.id };
	if (data.primary_node_id) {
	  const assignment = await assignKnowledgeArticleNodeAction(id, data.primary_node_id);
	  if (!assignment.success) return { success: false, error: "Revisi tersimpan, tetapi struktur pengetahuan gagal diperbarui. Muat ulang sebelum melanjutkan.", createdId: created.id };
	}
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
