"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;

export type TrainingCourseOption = { id: number; short_name: string; full_name: string; summary: string; category: string; visible: boolean };
export type TrainingCourseInput = { moodle_course_id: number; required: boolean };
export type TrainingCohortInput = { id?: string; label: string; starts_at: string | null; ends_at: string | null; enrollment_opens_at: string | null; enrollment_closes_at: string | null; status: "scheduled" | "cancelled" | "completed" };
export type TrainingProgramInput = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  audience: string;
  eligibility_text: string;
  category?: string;
  level?: "Pemula" | "Menengah" | "Mahir";
  tags?: string[];
  courses: TrainingCourseInput[];
  cohorts: TrainingCohortInput[];
  expected_version?: number;
};
export type TrainingProgram = TrainingProgramInput & {
  id: string;
  status: "draft" | "in_review" | "approved" | "published" | "archived";
  version: number;
  updated_at: string;
  category: string;
  level: "Pemula" | "Menengah" | "Mahir";
  tags: string[];
  courses: Array<TrainingCourseInput & { sort_order: number }>;
  cohorts: Array<TrainingCohortInput & { id: string; sort_order: number }>;
  cover_image_url?: string;
};

async function identity() {
  const [session, token] = await Promise.all([getServerSession(authOptions), getServerAccessToken()]);
  return { session: session as typeof session & { roles?: string[] }, token };
}

async function problem(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.detail || fallback;
}

export async function getTrainingWorkspaceAction(filter: { q?: string; status?: string; page?: number } = {}) {
  const { session, token } = await identity();
  if (!session || !token || !API_BASE) return { success: false as const, error: "Workspace program belum tersedia", programs: [], courses: [], roles: [] };
  const query = new URLSearchParams({ q: (filter.q || "").slice(0, 100), status: filter.status || "all", page: String(Math.max(1, filter.page || 1)), page_size: "50" });
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [programResponse, courseResponse] = await Promise.all([
      fetch(`${API_BASE}/api/v1/admin/training-programs?${query}`, { headers, cache: "no-store" }),
      fetch(`${API_BASE}/api/v1/admin/training-programs/course-options`, { headers, cache: "no-store" }),
    ]);
    if (!programResponse.ok || !courseResponse.ok) return { success: false as const, error: courseResponse.status === 503 ? "Katalog Moodle belum tersedia; komposisi dikunci sementara." : "Workspace program belum dapat dimuat", programs: [], courses: [], roles: session.roles || [] };
    const [programs, courses] = await Promise.all([programResponse.json(), courseResponse.json()]);
    const normalizedPrograms = ((programs.data || []) as TrainingProgram[]).map((item) => ({
      ...item,
      category: item.category || "Umum",
      level: (item.level as "Pemula" | "Menengah" | "Mahir") || "Menengah",
      tags: Array.isArray(item.tags) ? item.tags : [],
      courses: Array.isArray(item.courses) ? item.courses : [],
      cohorts: Array.isArray(item.cohorts) ? item.cohorts : [],
      cover_image_url: item.cover_image_url || "",
    }));
    return { success: true as const, programs: normalizedPrograms, courses: (courses.data || []) as TrainingCourseOption[], pagination: programs.pagination, roles: session.roles || [] };
  } catch {
    return { success: false as const, error: "Workspace program belum dapat dijangkau", programs: [], courses: [], roles: session.roles || [] };
  }
}

async function mutate(path: string, method: string, body: unknown) {
  const { session, token } = await identity();
  if (!session || !token || !API_BASE) {
    if (!session) {
      return {
        success: false as const,
        error: "Sesi login Anda telah berakhir. Silakan muat ulang halaman untuk masuk kembali.",
      };
    }
    if (!token) {
      return {
        success: false as const,
        error: "Token otentikasi kedaluwarsa. Silakan muat ulang halaman untuk memperbarui sesi login Anda.",
      };
    }
    return {
      success: false as const,
      error: "Layanan API Teman Belajar belum dapat dihubungi.",
    };
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    let fallbackMsg = "Program belum dapat disimpan.";
    if (response.status === 409) {
      fallbackMsg = "Terjadi konflik versi program. Data program telah diperbarui oleh proses lain. Muat ulang halaman untuk mendapatkan versi terbaru.";
    } else if (response.status === 400) {
      fallbackMsg = "Data program atau gelombang tidak valid. Periksa kembali format isian dan jadwal gelombang.";
    } else if (response.status === 403) {
      fallbackMsg = "Anda tidak memiliki hak akses yang cukup untuk menyimpan perubahan program pelatihan.";
    }
    return {
      success: false as const,
      error: await problem(response, fallbackMsg),
      conflict: response.status === 409,
    };
  }
  const data = (await response.json()) as TrainingProgram;
  revalidatePath("/dashboard/training-programs");
  revalidatePath("/training-programs");
  return { success: true as const, data };
}

export async function createTrainingProgramAction(input: TrainingProgramInput) {
  return mutate("/api/v1/admin/training-programs", "POST", input);
}

export async function updateTrainingProgramAction(id: string, input: TrainingProgramInput) {
  return mutate(`/api/v1/admin/training-programs/${id}`, "PATCH", input);
}

export async function transitionTrainingProgramAction(id: string, status: TrainingProgram["status"]) {
  return mutate(`/api/v1/admin/training-programs/${id}/transition`, "POST", { status });
}

export interface TrainingProgramOptionItem {
  slug: string;
  title: string;
  cohorts?: Array<{ id: string; label: string }>;
}

export async function getTrainingProgramOptionsAction(): Promise<{
  success: boolean;
  programs: TrainingProgramOptionItem[];
}> {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
  try {
    const publicRes = await fetch(`${API_BASE}/api/v1/training-programs?page_size=100`, {
      cache: "no-store",
    });
    if (publicRes.ok) {
      const data = await publicRes.json();
      const programs: TrainingProgramOptionItem[] = ((data.data || []) as any[]).map((p) => ({
        slug: p.slug,
        title: p.title,
        cohorts: Array.isArray(p.cohorts)
          ? p.cohorts.map((c: any) => ({ id: c.id, label: c.label }))
          : [],
      }));
      if (programs.length > 0) {
        return { success: true, programs };
      }
    }

    const { session, token } = await identity();
    if (session && token) {
      const adminRes = await fetch(`${API_BASE}/api/v1/admin/training-programs?status=all&page_size=100`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (adminRes.ok) {
        const data = await adminRes.json();
        const programs: TrainingProgramOptionItem[] = ((data.data || []) as any[]).map((p) => ({
          slug: p.slug,
          title: p.title,
          cohorts: Array.isArray(p.cohorts)
            ? p.cohorts.map((c: any) => ({ id: c.id, label: c.label }))
            : [],
        }));
        return { success: true, programs };
      }
    }
  } catch (error) {
    console.error("[getTrainingProgramOptionsAction] Failed to fetch program options:", error);
  }

  return { success: false, programs: [] };
}
