import "server-only";

import { getBackendAccessToken } from "@/lib/server-auth";

export interface PublicWebinarItem {
  id: number;
  title: string;
  summary: string;
  description?: string;
  speaker: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number;
  registered_count: number;
  status: "upcoming" | "live" | "completed" | "cancelled";
  registered: boolean;
  cancellation_allowed: boolean;
  join_url?: string;
  recording_url?: string;
  source: string;
  cover_image_url?: string;
}

export interface PublicWebinarListResponse {
  data: PublicWebinarItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

function apiBase() {
  return process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
}

export async function listPublicWebinars(options?: {
  page?: number;
  pageSize?: number;
  status?: string;
  query?: string;
}): Promise<PublicWebinarListResponse> {
  const base = apiBase();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 12;

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (options?.status && options.status !== "all") {
    params.set("status", options.status);
  }
  if (options?.query) {
    params.set("q", options.query);
  }

  const token = await getBackendAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${base}/api/v1/webinars?${params.toString()}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const json = await res.json();
      const raw = Array.isArray(json.data) ? json.data : (Array.isArray(json.items) ? json.items : []);
      const items: PublicWebinarItem[] = raw.map((s: any) => ({
        id: s.id,
        title: s.title,
        summary: s.summary || s.description || "",
        description: s.description || "",
        speaker: Array.isArray(s.speakers) && s.speakers.length > 0 ? s.speakers[0] : (s.speaker || ""),
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        timezone: s.timezone || "Asia/Jakarta",
        capacity: s.capacity || 100,
        registered_count: s.registered_count || 0,
        status: s.status || "upcoming",
        registered: Boolean(s.registered),
        cancellation_allowed: Boolean(s.cancellation_allowed),
        join_url: s.join_url,
        recording_url: s.recording_url,
        source: s.source || "zoom",
        cover_image_url: s.cover_image_url,
      }));
      return {
        data: items,
        page: json.page || page,
        page_size: json.page_size || pageSize,
        total: json.total || items.length,
        total_pages: json.total_pages || 1,
      };
    }
  } catch (err) {
    console.error("Failed to list public webinars:", err);
  }

  return {
    data: [],
    page: 1,
    page_size: pageSize,
    total: 0,
    total_pages: 1,
  };
}

export async function getPublicWebinarDetail(id: number): Promise<PublicWebinarItem | null> {
  const base = apiBase();
  const token = await getBackendAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${base}/api/v1/webinars/${id}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const s = await res.json();
      return {
        id: s.id,
        title: s.title,
        summary: s.summary || s.description || "",
        description: s.description || "",
        speaker: Array.isArray(s.speakers) && s.speakers.length > 0 ? s.speakers[0] : (s.speaker || ""),
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        timezone: s.timezone || "Asia/Jakarta",
        capacity: s.capacity || 100,
        registered_count: s.registered_count || 0,
        status: s.status || "upcoming",
        registered: Boolean(s.registered),
        cancellation_allowed: Boolean(s.cancellation_allowed),
        join_url: s.join_url,
        recording_url: s.recording_url,
        source: s.source || "zoom",
        cover_image_url: s.cover_image_url,
      };
    }
  } catch (err) {
    console.error(`Failed to get public webinar #${id}:`, err);
  }

  return null;
}

/** Compatibility aliases for unified catalog and legacy callers */
export async function listWebinars(page = 1, pageSize = 12) {
  const res = await listPublicWebinars({ page, pageSize });
  return {
    data: {
      data: res.data,
      page: res.page,
      page_size: res.page_size,
      total: res.total,
      total_pages: res.total_pages,
    },
  };
}

export async function getWebinar(id: number) {
  const data = await getPublicWebinarDetail(id);
  return { data };
}
