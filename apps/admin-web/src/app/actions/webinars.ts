"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type {
  AdminWebinarItem,
  AdminWebinarDetailItem,
  AdminWebinarListResponse,
  CreateAdminWebinarInput,
  UpdateAdminWebinarInput,
} from "@/types/webinar";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

function mapSessionToAdminItem(s: any): AdminWebinarItem {
  const speaker = Array.isArray(s.speakers) && s.speakers.length > 0 ? s.speakers[0] : (s.speaker || "");
  let status: AdminWebinarItem["status"] = "upcoming";
  if (s.status === "live" || s.status === "in_progress") {
    status = "in_progress";
  } else if (s.status === "completed") {
    status = "completed";
  } else if (s.status === "cancelled") {
    status = "cancelled";
  }

  return {
    id: s.id,
    title: s.title,
    description: s.summary || s.description || "",
    speaker: speaker,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    timezone: s.timezone || "Asia/Jakarta",
    capacity: s.capacity || 100,
    enrolled_count: s.registered_count || 0,
    status: status,
    join_url: s.join_url || "",
    recording_url: s.recording_url || "",
    provider: (s.source as any) || "zoom",
    provider_ready: true,
  };
}

export async function getAdminWebinarsAction(
  page = 1,
  pageSize = 50,
  status?: string,
  speaker?: string,
  query?: string
): Promise<{ success: boolean; data?: AdminWebinarListResponse; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (status && status !== "all") params.set("status", status);
    if (speaker && speaker !== "all") params.set("speaker", speaker);
    if (query) params.set("q", query);

    const response = await fetch(`${API_BASE}/api/v1/admin/webinars?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      const rawItems = Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : []);
      const items: AdminWebinarItem[] = rawItems.map(mapSessionToAdminItem);
      return {
        success: true,
        data: {
          items,
          total: data.total || items.length,
        },
      };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Gagal memuat webinar (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}

export async function createAdminWebinarAction(
  input: CreateAdminWebinarInput
): Promise<{ success: boolean; data?: AdminWebinarItem; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  if (!input.title || input.title.trim().length < 5) {
    return { success: false, error: "Judul webinar minimal harus 5 karakter" };
  }
  if (!input.speaker || input.speaker.trim().length < 2) {
    return { success: false, error: "Nama narasumber wajib diisi" };
  }
  if (!input.starts_at || !input.ends_at) {
    return { success: false, error: "Waktu mulai dan selesai wajib ditentukan" };
  }
  if (new Date(input.starts_at) >= new Date(input.ends_at)) {
    return { success: false, error: "Waktu mulai harus lebih awal dari waktu selesai" };
  }
  if (input.capacity < 1) {
    return { success: false, error: "Kapasitas peserta minimal 1 kursi" };
  }

  try {
    const payload = {
      title: input.title.trim(),
      summary: input.description?.trim() || "",
      description: input.description?.trim() || "",
      speaker: input.speaker.trim(),
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      timezone: "Asia/Jakarta",
      capacity: input.capacity,
      join_url: input.join_url?.trim() || "",
      provider: input.provider || "zoom",
    };

    const response = await fetch(`${API_BASE}/api/v1/admin/webinars`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 201) {
      const created = await response.json();
      revalidatePath("/dashboard/webinars");
      return { success: true, data: mapSessionToAdminItem(created) };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Gagal membuat webinar (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}

export async function getAdminWebinarDetailAction(
  id: number
): Promise<{ success: boolean; data?: AdminWebinarDetailItem; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/webinars/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      const baseItem = mapSessionToAdminItem(data);
      const detail: AdminWebinarDetailItem = {
        ...baseItem,
        attendance_seconds: data.attendance_seconds || 0,
        attendance_state: data.attendance_state || "pending",
        synced_at: data.synced_at || new Date().toISOString(),
        attendees: Array.isArray(data.attendees) ? data.attendees : [],
      };
      return { success: true, data: detail };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Sesi webinar tidak ditemukan (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}

export async function updateAdminWebinarAction(
  id: number,
  input: UpdateAdminWebinarInput
): Promise<{ success: boolean; data?: AdminWebinarItem; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const payload: any = {};
    if (input.title) payload.title = input.title.trim();
    if (input.description !== undefined) {
      payload.summary = input.description.trim();
      payload.description = input.description.trim();
    }
    if (input.speaker) payload.speaker = input.speaker.trim();
    if (input.starts_at) payload.starts_at = input.starts_at;
    if (input.ends_at) payload.ends_at = input.ends_at;
    if (input.capacity) payload.capacity = Number(input.capacity);
    if (input.status) {
      // map frontend in_progress to live if needed
      payload.status = input.status === "in_progress" ? "live" : input.status;
    }
    if (input.join_url !== undefined) payload.join_url = input.join_url.trim();
    if (input.recording_url !== undefined) payload.recording_url = input.recording_url.trim();
    if (input.provider) payload.provider = input.provider;

    const response = await fetch(`${API_BASE}/api/v1/admin/webinars/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const updated = await response.json();
      revalidatePath("/dashboard/webinars");
      return { success: true, data: mapSessionToAdminItem(updated) };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Gagal memperbarui webinar (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}

export async function deleteAdminWebinarAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/webinars/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok || response.status === 204) {
      revalidatePath("/dashboard/webinars");
      return { success: true };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Gagal membatalkan webinar (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}

export async function updateAttendanceAction(
  webinarId: number,
  attendeeId: string,
  status: "attended" | "registered" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/webinars/${webinarId}/attendance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attendee_id: attendeeId, status }),
    });

    if (response.ok) {
      revalidatePath("/dashboard/webinars");
      return { success: true };
    }

    const errData = await response.json().catch(() => null);
    return {
      success: false,
      error: errData?.detail || errData?.title || `Gagal mengubah status kehadiran (HTTP ${response.status})`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Terjadi kesalahan jaringan" };
  }
}
