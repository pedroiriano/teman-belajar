"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;

export type CourseReview = {
  id: string;
  program_id: string;
  program_slug: string;
  moodle_course_id?: number;
  user_subject: string;
  author_name: string;
  rating: number;
  title: string;
  content: string;
  status: "published" | "hidden" | "flagged";
  created_at: string;
  updated_at: string;
};

export type CourseReviewFilter = {
  program_slug?: string;
  status?: string;
  rating?: number;
  q?: string;
  page?: number;
  page_size?: number;
};

export type CourseReviewListResponse = {
  reviews: CourseReview[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

async function identity() {
  const [session, token] = await Promise.all([
    getServerSession(authOptions),
    getServerAccessToken(),
  ]);
  return {
    session: session as typeof session & { roles?: string[] },
    token,
  };
}

export async function getCourseReviewsAction(filter: CourseReviewFilter = {}) {
  const { session, token } = await identity();
  if (!session || !token || !API_BASE) {
    return {
      success: false as const,
      error: "Sesi tidak sah atau API belum siap",
      reviews: [] as CourseReview[],
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
      roles: [] as string[],
    };
  }

  const query = new URLSearchParams({
    page: String(Math.max(1, filter.page || 1)),
    page_size: String(filter.page_size || 20),
  });
  if (filter.program_slug) query.set("program_slug", filter.program_slug);
  if (filter.status && filter.status !== "all") query.set("status", filter.status);
  if (filter.rating) query.set("rating", String(filter.rating));
  if (filter.q) query.set("q", filter.q);

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/training-programs/reviews?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        success: false as const,
        error: "Gagal memuat ulasan pelatihan",
        reviews: [] as CourseReview[],
        pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
        roles: session.roles || [],
      };
    }

    const data = (await res.json()) as CourseReviewListResponse;
    return {
      success: true as const,
      reviews: data.reviews || [],
      pagination: data.pagination,
      roles: session.roles || [],
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal terhubung ke API",
      reviews: [] as CourseReview[],
      pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
      roles: session.roles || [],
    };
  }
}

export async function moderateReviewStatusAction(
  id: string,
  status: "published" | "hidden" | "flagged"
) {
  const { session, token } = await identity();
  if (!session || !token || !API_BASE) {
    return { success: false as const, error: "Sesi tidak sah" };
  }

  const allowedRoles = ["Portal Administrator", "Content Editor", "Reviewer"];
  const hasRole = (session.roles || []).some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    return { success: false as const, error: "Akses ditolak: role tidak memadai" };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/training-programs/reviews/${id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false as const,
        error: err.detail || err.error || "Gagal memperbarui status ulasan",
      };
    }

    revalidatePath("/dashboard/course-reviews");
    revalidatePath("/training-programs");
    return { success: true as const, status };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Gagal terhubung ke API",
    };
  }
}
