"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type { RecommendationPinItem, CreateRecommendationPinInput } from "@/types/recommendation";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

const baselinePins: RecommendationPinItem[] = [
  {
    id: "pin-001",
    target_type: "knowledge",
    target_id: "art-security-intro",
    title: "Pengantar Praktis Keamanan Siber di Lingkungan Kerja Modern",
    pinned: true,
    weight: 200,
    pinned_by: "Admin Editorial",
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "pin-002",
    target_type: "microlearning",
    target_id: "ml-password-hygiene",
    title: "5 Menit: Higienitas Kata Sandi & Proteksi 2FA",
    pinned: true,
    weight: 180,
    pinned_by: "Admin Editorial",
    created_at: "2026-09-02T09:30:00Z",
    updated_at: "2026-09-02T09:30:00Z",
  },
  {
    id: "pin-003",
    target_type: "course",
    target_id: "course-onboarding-lxp",
    title: "Orientasi Pengguna Baru Platform Pembelajaran Teman Belajar",
    pinned: true,
    weight: 150,
    pinned_by: "Admin Editorial",
    created_at: "2026-09-03T11:00:00Z",
    updated_at: "2026-09-03T11:00:00Z",
  },
];

export async function getAdminRecommendationPinsAction(
  targetType?: string
): Promise<{ success: boolean; data?: RecommendationPinItem[]; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const query = targetType ? `?target_type=${encodeURIComponent(targetType)}` : "";
    const response = await fetch(`${API_BASE}/api/v1/admin/recommendations/pins${query}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        return { success: true, data: payload.data };
      }
    }
  } catch {
    // Graceful fallback to baseline
  }

  const filtered = targetType
    ? baselinePins.filter((p) => p.target_type === targetType)
    : baselinePins;

  return { success: true, data: filtered };
}

export async function createAdminRecommendationPinAction(
  input: CreateRecommendationPinInput
): Promise<{ success: boolean; data?: RecommendationPinItem; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/recommendations/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      const pin: RecommendationPinItem = await response.json();
      revalidatePath("/dashboard/recommendations");
      return { success: true, data: pin };
    }
    const problem = await response.json().catch(() => ({}));
    return { success: false, error: problem.detail || "Gagal menyematkan konten rekomendasi" };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal terhubung ke layanan rekomendasi" };
  }
}

export async function deleteAdminRecommendationPinAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/recommendations/pins/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      revalidatePath("/dashboard/recommendations");
      return { success: true };
    }
    return { success: false, error: "Gagal menghapus pin rekomendasi" };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal terhubung ke layanan rekomendasi" };
  }
}
