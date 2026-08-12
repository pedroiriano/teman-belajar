"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createKnowledgeAction(data: { title: string; slug: string; summary: string; body: string }) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        body: data.body,
        category_id: "00000000-0000-0000-0000-000000000000" // For now, we mock category if needed
      }),
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

export async function createKnowledgeRevisionAction(id: string, data: { body: string }) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge/${id}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({
        body: data.body,
      }),
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

export async function transitionKnowledgeAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/knowledge/${id}/transition`, {
      method: "POST", // we used POST in main.go
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.accessToken}`
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
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  
  try {
    const res = await fetch(`${API_BASE}/api/v1/knowledge`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch knowledge" };
    }

    const data = await res.json();
    return { success: true, data: data.data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to communicate with API" };
  }
}
