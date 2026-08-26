"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;

export type TrainingCourseOption = { id: number; short_name: string; full_name: string; summary: string; category: string; visible: boolean };
export type TrainingCourseInput = { moodle_course_id: number; required: boolean };
export type TrainingCohortInput = { label: string; starts_at: string | null; ends_at: string | null; enrollment_opens_at: string | null; enrollment_closes_at: string | null; status: "scheduled" | "cancelled" | "completed" };
export type TrainingProgramInput = { slug: string; title: string; summary: string; description: string; audience: string; eligibility_text: string; courses: TrainingCourseInput[]; cohorts: TrainingCohortInput[]; expected_version?: number };
export type TrainingProgram = TrainingProgramInput & { id: string; status: "draft" | "in_review" | "approved" | "published" | "archived"; version: number; updated_at: string; courses: Array<TrainingCourseInput & { sort_order: number }>; cohorts: Array<TrainingCohortInput & { id: string; sort_order: number }> };

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
    return { success: true as const, programs: (programs.data || []) as TrainingProgram[], courses: (courses.data || []) as TrainingCourseOption[], pagination: programs.pagination, roles: session.roles || [] };
  } catch {
    return { success: false as const, error: "Workspace program belum dapat dijangkau", programs: [], courses: [], roles: session.roles || [] };
  }
}

async function mutate(path: string, method: string, body: unknown) {
  const { session, token } = await identity();
  if (!session || !token || !API_BASE) return { success: false as const, error: "Sesi tidak sah" };
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  if (!response.ok) return { success: false as const, error: await problem(response, "Program belum dapat disimpan"), conflict: response.status === 409 };
  const data = await response.json() as TrainingProgram;
  revalidatePath("/dashboard/training-programs"); revalidatePath("/training-programs");
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
