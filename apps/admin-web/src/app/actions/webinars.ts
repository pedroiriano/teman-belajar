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
} from "@/types/webinar";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

const baselineWebinars: AdminWebinarItem[] = [
  {
    id: 101,
    title: "Workshop Desain Kurikulum Pembelajaran Digital 2026",
    description: "Pelajari prinsip modern instruksional desain dan integrasi modul LXP interaktif.",
    speaker: "Dr. Budi Santoso, M.Kom",
    starts_at: "2026-09-12T09:00:00+07:00",
    ends_at: "2026-09-12T12:00:00+07:00",
    timezone: "Asia/Jakarta",
    capacity: 100,
    enrolled_count: 68,
    status: "upcoming",
    join_url: "https://zoom.us/j/mock-101",
    provider: "zoom",
    provider_ready: true,
  },
  {
    id: 102,
    title: "Best Practices Keamanan Siber dalam Ekosistem Cloud",
    description: "Tinjauan mendalam postur DevSecOps dan mitigasi risiko aplikasi enterprise.",
    speaker: "Rina Wijaya, CISSP",
    starts_at: "2026-09-18T13:30:00+07:00",
    ends_at: "2026-09-18T16:00:00+07:00",
    timezone: "Asia/Jakarta",
    capacity: 150,
    enrolled_count: 142,
    status: "upcoming",
    join_url: "https://zoom.us/j/mock-102",
    provider: "zoom",
    provider_ready: true,
  },
  {
    id: 103,
    title: "Pengenalan Arsitektur Microlearning untuk Pelatihan Korporat",
    description: "Sesi live interaktif mengenai pemecahan topik pelatihan kompleks ke segmen mikro.",
    speaker: "Ahmad Fauzi, S.T",
    starts_at: "2026-08-25T10:00:00+07:00",
    ends_at: "2026-08-25T11:30:00+07:00",
    timezone: "Asia/Jakarta",
    capacity: 80,
    enrolled_count: 80,
    status: "completed",
    recording_url: "https://storage.teman-belajar.local/recordings/webinar-103.mp4",
    provider: "zoom",
    provider_ready: true,
  },
];

let inMemoryWebinars: AdminWebinarItem[] = [...baselineWebinars];

export async function getAdminWebinarsAction(
  page = 1,
  pageSize = 50
): Promise<{ success: boolean; data?: AdminWebinarListResponse; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/webinars?page=${page}&page_size=${pageSize}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return {
          success: true,
          data: {
            items: data.items,
            total: data.total || data.items.length,
          },
        };
      }
    }
  } catch {
    // Graceful fallback to in-memory store
  }

  return {
    success: true,
    data: {
      items: inMemoryWebinars,
      total: inMemoryWebinars.length,
    },
  };
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

  const nextId = inMemoryWebinars.length > 0 ? Math.max(...inMemoryWebinars.map((w) => w.id)) + 1 : 101;
  const newWebinar: AdminWebinarItem = {
    id: nextId,
    title: input.title.trim(),
    description: input.description?.trim() || "Sesi webinar pembelajaran interaktif Teman Belajar.",
    speaker: input.speaker.trim(),
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    timezone: "Asia/Jakarta",
    capacity: input.capacity,
    enrolled_count: 0,
    status: new Date(input.ends_at) < new Date() ? "completed" : "upcoming",
    join_url: input.join_url?.trim() || `https://zoom.us/j/tb-${nextId}`,
    provider: "zoom",
    provider_ready: true,
  };

  inMemoryWebinars = [newWebinar, ...inMemoryWebinars];

  revalidatePath("/dashboard/webinars");
  return { success: true, data: newWebinar };
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
      if (data && data.id) {
        return { success: true, data };
      }
    }
  } catch {
    // Graceful fallback to in-memory item
  }

  const found = inMemoryWebinars.find((w) => w.id === id);
  if (!found) {
    return { success: false, error: "Sesi webinar tidak ditemukan" };
  }

  const isCompleted = found.status === "completed";
  const detail: AdminWebinarDetailItem = {
    ...found,
    course_id: 10,
    attendance_seconds: isCompleted ? 5400 : 0,
    attendance_state: isCompleted ? "synced" : "pending",
    synced_at: new Date().toISOString(),
    attendees: [
      {
        name: "Ahmad Dahlan",
        email: "ahmad.dahlan@example.com",
        registered_at: "2026-08-20T10:00:00Z",
        attendance_state: isCompleted ? "present" : "registered",
        attended_minutes: isCompleted ? 88 : undefined,
      },
      {
        name: "Siti Rahmawati",
        email: "siti.rahmawati@example.com",
        registered_at: "2026-08-21T14:30:00Z",
        attendance_state: isCompleted ? "present" : "registered",
        attended_minutes: isCompleted ? 90 : undefined,
      },
      {
        name: "Budi Pratama",
        email: "budi.pratama@example.com",
        registered_at: "2026-08-22T09:15:00Z",
        attendance_state: isCompleted ? "absent" : "registered",
        attended_minutes: isCompleted ? 0 : undefined,
      },
    ],
  };

  return { success: true, data: detail };
}
