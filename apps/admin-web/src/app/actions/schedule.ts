"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type { CreateScheduleInput, ScheduleEvent, ScheduleModule } from "@/types/schedule";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export type GetScheduleEventsResult =
  | { success: true; data: ScheduleEvent[]; conflictCount: number }
  | { success: false; error: string; status?: number };

/**
 * Fetches publication schedule events from PostgreSQL with slot conflict detection.
 * Enriched with hasConflict and conflictDetails attributes.
 */
export async function getScheduleEventsAction(
  month?: string,
  selectedModule?: ScheduleModule | "all"
): Promise<GetScheduleEventsResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (selectedModule && selectedModule !== "all") params.set("module", selectedModule);

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/schedules?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || err.title || `Error ${res.status}`, status: res.status };
    }

    const payload = await res.json();
    return {
      success: true,
      data: payload.data || [],
      conflictCount: payload.conflict_count || 0,
    };
  } catch {
    return { success: false, error: "Gagal memuat jadwal publikasi dari database" };
  }
}

export type CreateScheduleResult =
  | { success: true; data: ScheduleEvent }
  | { success: false; error: string };

/**
 * Persists a new publication schedule into PostgreSQL database.
 */
export async function createScheduleEventAction(
  input: CreateScheduleInput
): Promise<CreateScheduleResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized" };
  }

  if (!input.title || input.title.trim().length < 3) {
    return { success: false, error: "Judul jadwal minimal 3 karakter" };
  }
  if (!input.targetDate) {
    return { success: false, error: "Tanggal publikasi wajib dipilih" };
  }
  if (!input.targetTime) {
    return { success: false, error: "Waktu publikasi wajib dipilih" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/schedules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title.trim(),
        target_date: input.targetDate,
        target_time: input.targetTime,
        module: input.module,
        owner: input.owner || session.user?.name || "Editor",
        cohort_label: input.cohortLabel?.trim() || undefined,
        participants_count: input.participantsCount || 0,
        description: input.description?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || err.title || "Gagal membuat jadwal" };
    }

    const created = await res.json();
    return { success: true, data: created };
  } catch {
    return { success: false, error: "Gagal menghubungi layanan jadwal publikasi" };
  }
}

/**
 * Cancels a pending publication schedule in the database.
 */
export async function cancelScheduleEventAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/schedules/${id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.detail || err.title || "Gagal membatalkan jadwal" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghubungi layanan pembatalan jadwal" };
  }
}
