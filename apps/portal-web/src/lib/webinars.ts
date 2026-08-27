import "server-only";

import { getBackendAccessToken } from "@/lib/server-auth";

export type WebinarSession = {
  id: number;
  course_id: number;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  timezone: "Asia/Jakarta";
  speakers: string[];
  capacity: number;
  registered_count: number;
  registration_state: "configuration_required" | "open" | "full" | "registered";
  status: "scheduled" | "live" | "completed" | "cancelled";
  registered: boolean;
  cancellation_allowed: boolean;
  join_url?: string;
  recording_url?: string;
  attendance_seconds: number;
  attendance_state: "pending" | "synced";
  source: "moodle_mod_zoom";
  synced_at: string;
};

export type WebinarPage = { data: WebinarSession[]; page: number; page_size: number; total: number; total_pages: number; synced_at: string };
export type WebinarResult<T> = { authenticated: boolean; data: T | null; status: number };

async function request<T>(path: string): Promise<WebinarResult<T>> {
  const [base, token] = [process.env.PORTAL_API_INTERNAL_URL, await getBackendAccessToken()];
  if (!token) return { authenticated: false, data: null, status: 401 };
  if (!base) return { authenticated: true, data: null, status: 503 };
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("json")) {
      return { authenticated: true, data: null, status: response.status || 503 };
    }
    return { authenticated: true, data: await response.json() as T, status: response.status };
  } catch {
    return { authenticated: true, data: null, status: 503 };
  }
}

export function listWebinars(page: number) {
  return request<WebinarPage>(`/api/v1/webinars?page=${page}&page_size=12`);
}

export function getWebinar(id: number) {
  return request<WebinarSession>(`/api/v1/webinars/${id}`);
}

export function formatWebinarTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}
