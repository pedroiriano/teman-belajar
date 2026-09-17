"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type {
  EnrollmentApplication,
  EnrollmentFilter,
  EnrollmentListResponse,
  EnrollmentMetrics,
  ManualEnrollInput,
} from "@/types/enrollment";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

async function checkAuth(): Promise<{
  session: Awaited<ReturnType<typeof getServerSession>>;
  token: string | null;
  authorized: boolean;
  userRoles: string[];
  errorReason?: "session_expired" | "unauthorized";
}> {
  const [session, token] = await Promise.all([
    getServerSession(authOptions),
    getServerAccessToken(),
  ]);

  if (!session || !token) {
    return { session, token: null, authorized: false, userRoles: [], errorReason: "session_expired" };
  }

  const userRoles = (session as { roles?: string[] })?.roles || [];
  const authorized = userRoles.some((r) =>
    ["Portal Administrator", "Training Manager", "Content Editor", "Administrator", "Super Administrator"].includes(r)
  );

  if (!authorized) {
    return { session, token, authorized: false, userRoles, errorReason: "unauthorized" };
  }

  return { session, token, authorized, userRoles };
}

interface ApiEnrollmentListResponse {
  data: EnrollmentApplication[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  metrics: {
    total_applications: number;
    pending_count: number;
    confirmed_count: number;
    rejected_count: number;
  };
}

export async function getEnrollmentsAction(filter: EnrollmentFilter = {}): Promise<EnrollmentListResponse> {
  const { authorized, token } = await checkAuth();
  if (!authorized || !token) {
    return {
      enrollments: [],
      pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 },
      metrics: { total: 0, pending: 0, confirmed: 0, rejected: 0 },
    };
  }

  const query = new URLSearchParams({
    page: String(Math.max(1, filter.page || 1)),
    page_size: String(Math.max(1, filter.page_size || 10)),
  });

  if (filter.status && filter.status !== "all") query.set("status", filter.status);
  if (filter.program_slug && filter.program_slug !== "all") query.set("program_slug", filter.program_slug);
  if (filter.q) query.set("q", filter.q);

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/enrollments?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        enrollments: [],
        pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 },
        metrics: { total: 0, pending: 0, confirmed: 0, rejected: 0 },
      };
    }

    const data = (await res.json()) as ApiEnrollmentListResponse;
    const metrics: EnrollmentMetrics = {
      total: data.metrics?.total_applications ?? 0,
      pending: data.metrics?.pending_count ?? 0,
      confirmed: data.metrics?.confirmed_count ?? 0,
      rejected: data.metrics?.rejected_count ?? 0,
    };

    return {
      enrollments: data.data || [],
      pagination: data.pagination,
      metrics,
    };
  } catch (error) {
    console.error("[getEnrollmentsAction] failed to fetch enrollments:", error);
    return {
      enrollments: [],
      pagination: { page: 1, page_size: 10, total: 0, total_pages: 0 },
      metrics: { total: 0, pending: 0, confirmed: 0, rejected: 0 },
    };
  }
}

export async function confirmEnrollmentAction(id: string, notes?: string) {
  const { authorized, token, errorReason } = await checkAuth();
  if (!authorized || !token) {
    return {
      success: false,
      error: errorReason === "session_expired"
        ? "Sesi Anda telah berakhir. Silakan logout dan login kembali."
        : "Tidak memiliki hak akses untuk mengonfirmasi pendaftaran.",
    };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/enrollments/${encodeURIComponent(id)}/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: notes || "" }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (errData as { detail?: string }).detail || `Gagal mengonfirmasi permohonan pendaftaran (HTTP ${res.status}).`,
      };
    }

    const item = await res.json();
    revalidatePath("/dashboard/enrollments");
    revalidatePath("/dashboard/training-programs");
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal terhubung ke API.",
    };
  }
}

export async function rejectEnrollmentAction(id: string, reason: string) {
  const { authorized, token, errorReason } = await checkAuth();
  if (!authorized || !token) {
    return {
      success: false,
      error: errorReason === "session_expired"
        ? "Sesi Anda telah berakhir. Silakan logout dan login kembali."
        : "Tidak memiliki hak akses untuk menolak pendaftaran.",
    };
  }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "Alasan penolakan wajib diisi minimal 5 karakter." };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/enrollments/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: reason.trim() }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (errData as { detail?: string }).detail || "Gagal menolak permohonan pendaftaran.",
      };
    }

    const item = await res.json();
    revalidatePath("/dashboard/enrollments");
    revalidatePath("/dashboard/training-programs");
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal terhubung ke API.",
    };
  }
}

export async function manualEnrollAction(input: ManualEnrollInput) {
  const { authorized, token, errorReason } = await checkAuth();
  if (!authorized || !token) {
    return {
      success: false,
      error: errorReason === "session_expired"
        ? "Sesi Anda telah berakhir. Silakan logout dan login kembali."
        : "Tidak memiliki hak akses untuk mendaftarkan peserta.",
    };
  }

  if (!input.user_name || !input.user_email || !input.program_slug) {
    return { success: false, error: "Nama, email, dan program pelatihan wajib diisi." };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/enrollments/manual`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_subject: input.user_email.trim().toLowerCase(),
        user_name: input.user_name.trim(),
        user_email: input.user_email.trim().toLowerCase(),
        program_slug: input.program_slug.trim(),
        cohort_id: input.cohort_id || undefined,
        notes: input.notes?.trim() || undefined,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (errData as { detail?: string }).detail || "Gagal mendaftarkan peserta secara manual.",
      };
    }

    const item = await res.json();
    revalidatePath("/dashboard/enrollments");
    revalidatePath("/dashboard/training-programs");
    return { success: true, item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal terhubung ke API.",
    };
  }
}

export async function bulkConfirmEnrollmentsAction(ids: string[], notes?: string) {
  const { authorized } = await checkAuth();
  if (!authorized) {
    return { success: false, error: "Tidak memiliki hak akses untuk mengonfirmasi pendaftaran massal." };
  }

  let count = 0;
  for (const id of ids) {
    const res = await confirmEnrollmentAction(id, notes);
    if (res.success) {
      count++;
    }
  }

  revalidatePath("/dashboard/enrollments");
  revalidatePath("/dashboard/training-programs");
  return { success: true, count };
}

export async function bulkRejectEnrollmentsAction(ids: string[], reason: string) {
  const { authorized } = await checkAuth();
  if (!authorized) {
    return { success: false, error: "Tidak memiliki hak akses untuk menolak pendaftaran massal." };
  }

  let count = 0;
  for (const id of ids) {
    const res = await rejectEnrollmentAction(id, reason);
    if (res.success) {
      count++;
    }
  }

  revalidatePath("/dashboard/enrollments");
  revalidatePath("/dashboard/training-programs");
  return { success: true, count };
}
