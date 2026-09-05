"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export interface ReviewNote {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  notes: string;
  reviewer_id?: string;
  reviewer_name: string;
  created_at: string;
}

export interface GetReviewNotesResult {
  success: boolean;
  data?: ReviewNote[];
  error?: string;
  status?: number;
}

export interface CreateReviewNoteResult {
  success: boolean;
  data?: ReviewNote;
  error?: string;
  status?: number;
}

export async function getReviewNotesAction(
  entityType: string,
  entityId: string
): Promise<GetReviewNotesResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/admin/review-notes/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      return {
        success: false,
        error: problem.detail || problem.title || `Error ${response.status}`,
        status: response.status,
      };
    }

    const payload = await response.json();
    return {
      success: true,
      data: Array.isArray(payload.data) ? payload.data : [],
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat catatan editorial",
    };
  }
}

export async function createReviewNoteAction(
  entityType: string,
  entityId: string,
  action: string,
  notes: string
): Promise<CreateReviewNoteResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return { success: false, error: "Catatan tidak boleh kosong" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/review-notes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        action: action || "note",
        notes: trimmedNotes,
        reviewer_name: session.user?.name || "Editor",
      }),
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      return {
        success: false,
        error: problem.detail || problem.title || `Error ${response.status}`,
        status: response.status,
      };
    }

    const created: ReviewNote = await response.json();

    // Revalidate paths
    revalidatePath(`/dashboard/news/${entityId}`);
    revalidatePath(`/dashboard/knowledge/${entityId}`);
    revalidatePath(`/dashboard/announcements/${entityId}`);
    revalidatePath("/dashboard/review-queue");
    revalidatePath("/dashboard/workflow");

    return {
      success: true,
      data: created,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan catatan editorial",
    };
  }
}
