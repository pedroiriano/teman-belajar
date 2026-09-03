import "server-only";

import { getBackendAccessToken } from "@/lib/server-auth";

export type LearningPathKind = "course" | "knowledge" | "microlearning" | "webinar";
export type LearningPathItem = { id: string; key: string; kind: LearningPathKind; source_ref: string; label: string; summary?: string; url?: string; source_state: "available" | "degraded" | "unavailable"; source_checked_at: string; sort_order: number; required: boolean; milestone: boolean; prerequisite_keys: string[] };
export type LearningPath = { id: string; slug: string; published_version_number?: number; version: { number: number; title: string; summary: string; description: string; status: string; published_at?: string; items: LearningPathItem[] } };
export type LearningPathList = { data: LearningPath[]; pagination: { page: number; page_size: number; total: number; total_pages: number }; error?: true };
export type LearningPathProgress = { path: LearningPath; bound_version: number; items: Array<{ item_id: string; key: string; state: string; progress: number; locked: boolean; detail?: string }>; progress_percent: number; completed_items: number; total_items: number; next_step?: LearningPathItem; provenance: Record<string, string> };

const base = () => process.env.PORTAL_API_INTERNAL_URL;

export function isLearningPathSlug(value: string) {
  return value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isAllowedLearningPathUrl(value?: string) {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  try {
    const target = new URL(value);
    const configured = process.env.MOODLE_PUBLIC_BASE_URL;
    if (!configured) return false;
    return (target.protocol === "http:" || target.protocol === "https:") && target.origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

export async function listLearningPaths(query: string, page: number): Promise<LearningPathList> {
  const api = base();
  if (!api) return { data: [], pagination: { page: 1, page_size: 9, total: 0, total_pages: 0 }, error: true };
  const params = new URLSearchParams({ q: query.slice(0, 100), page: String(page), page_size: "9" });
  try {
    const response = await fetch(`${api}/api/v1/learning-paths?${params}`, {cache:"no-store"});
    if (!response.ok) throw new Error("unavailable");
    return response.json();
  } catch {
    return { data: [], pagination: { page, page_size: 9, total: 0, total_pages: 0 }, error: true };
  }
}

export async function getLearningPath(slug: string): Promise<LearningPath | null> {
  if (!isLearningPathSlug(slug)) return null;
  const api = base();
  if (!api) throw new Error("learning path API unavailable");
  const response = await fetch(`${api}/api/v1/learning-paths/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("learning path unavailable");
  return response.json();
}

export async function getLearningPathProgress(slug: string): Promise<{ authenticated: boolean; data: LearningPathProgress | null }> {
  const [api, token] = [base(), await getBackendAccessToken()];
  if (!token) return { authenticated: false, data: null };
  if (!api) return { authenticated: true, data: null };
  try {
    const response = await fetch(`${api}/api/v1/learning/me/learning-paths/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return { authenticated: true, data: response.ok ? await response.json() : null };
  } catch {
    return { authenticated: true, data: null };
  }
}

export async function getRelatedLearningPaths(currentSlug: string, limit = 3): Promise<LearningPath[]> {
  try {
    const list = await listLearningPaths("", 1);
    return (list.data || []).filter((item) => item.slug !== currentSlug).slice(0, limit);
  } catch {
    return [];
  }
}
