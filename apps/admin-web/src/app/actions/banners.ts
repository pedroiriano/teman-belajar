"use server";

import { revalidatePath } from "next/cache";
import { getServerAccessToken } from "@/lib/server-auth";
import type { HeroBanner, CreateBannerPayload, UpdateBannerPayload } from "@/types/banner";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export async function getAdminBannersAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<{
  success: boolean;
  data?: HeroBanner[];
  total?: number;
  error?: string;
}> {
  const token = await getServerAccessToken();
  if (!token) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    if (params?.search) query.set("q", params.search);
    if (params?.status && params.status !== "all") query.set("status", params.status);

    const qs = query.toString();
    const url = `${API_BASE}/api/v1/admin/banners${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { success: false, error: errBody.detail || errBody.title || "Gagal memuat daftar banner" };
    }

    const payload = await res.json();
    return {
      success: true,
      data: payload.data || [],
      total: payload.total ?? (payload.data || []).length,
    };
  } catch {
    return { success: false, error: "Layanan banner sedang tidak dapat diakses" };
  }
}

export async function createAdminBannerAction(
  payload: CreateBannerPayload
): Promise<{ success: boolean; data?: HeroBanner; error?: string }> {
  const token = await getServerAccessToken();
  if (!token) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/banners`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.detail || errBody.title || "Gagal membuat banner",
      };
    }

    const data: HeroBanner = await res.json();
    revalidatePath("/dashboard/banners");
    return { success: true, data };
  } catch {
    return { success: false, error: "Layanan banner sedang tidak dapat diakses" };
  }
}

export async function updateAdminBannerAction(
  id: string,
  payload: UpdateBannerPayload
): Promise<{ success: boolean; data?: HeroBanner; error?: string }> {
  const token = await getServerAccessToken();
  if (!token) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/banners/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.detail || errBody.title || "Gagal memperbarui banner",
      };
    }

    const data: HeroBanner = await res.json();
    revalidatePath("/dashboard/banners");
    return { success: true, data };
  } catch {
    return { success: false, error: "Layanan banner sedang tidak dapat diakses" };
  }
}

export async function toggleAdminBannerActiveAction(
  id: string
): Promise<{ success: boolean; data?: HeroBanner; error?: string }> {
  const token = await getServerAccessToken();
  if (!token) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/admin/banners/${encodeURIComponent(id)}/toggle-active`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.detail || errBody.title || "Gagal mengubah status aktif banner",
      };
    }

    const data: HeroBanner = await res.json();
    revalidatePath("/dashboard/banners");
    return { success: true, data };
  } catch {
    return { success: false, error: "Layanan banner sedang tidak dapat diakses" };
  }
}

export async function deleteAdminBannerAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getServerAccessToken();
  if (!token) {
    return { success: false, error: "Sesi tidak terotentikasi" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/banners/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.detail || errBody.title || "Gagal menghapus banner",
      };
    }

    revalidatePath("/dashboard/banners");
    return { success: true };
  } catch {
    return { success: false, error: "Layanan banner sedang tidak dapat diakses" };
  }
}
