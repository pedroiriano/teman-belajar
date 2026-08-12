"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;

if (!API_BASE) {
  throw new Error("Missing required environment variable: PORTAL_API_INTERNAL_URL");
}

export async function createNewsAction(data: { title: string, slug: string, excerpt: string, body: string }) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return { success: false, error: err?.detail || "Failed to create news" };
  }

  revalidatePath("/dashboard/news");
  return { success: true };
}

export async function transitionNewsAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessToken}`
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

export async function createAnnouncementAction(data: { title: string, slug: string, body: string, start_at: Date | null, end_at: Date | null }) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessToken}`
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

  revalidatePath("/dashboard/announcements");
  return { success: true };
}

export async function transitionAnnouncementAction(id: string, status: string) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized" };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessToken}`
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

export async function getAdminNewsAction() {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/news`, {
    headers: {
      "Authorization": `Bearer ${session.accessToken}`
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return { success: false, error: "Failed to fetch news", data: null };
  }

  const data = await res.json();
  return { success: true, data: data.data };
}

export async function getAdminAnnouncementsAction() {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const res = await fetch(`${API_BASE}/api/v1/admin/announcements`, {
    headers: {
      "Authorization": `Bearer ${session.accessToken}`
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return { success: false, error: "Failed to fetch announcements", data: null };
  }

  const data = await res.json();
  return { success: true, data: data.data };
}
