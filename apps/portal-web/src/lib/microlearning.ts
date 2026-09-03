import { getBackendAccessToken } from "@/lib/server-auth";

export type MicrolearningFormat = "article" | "video" | "quick";
export type MicrolearningItem = {
  id: string; slug: string; title: string; summary: string; body: string; format: MicrolearningFormat;
  duration_minutes: number; video_url?: string; featured_media_id?: string; status: string; version: number;
  seo_title?: string; seo_description?: string; indexable: boolean; published_at?: string; updated_at: string;
  related: Array<{ id: string; slug: string; title: string; summary: string; format: MicrolearningFormat; duration_minutes: number }>;
};
export type MicrolearningProgress = { item_id: string; progress_percent: number; position_seconds: number; updated_at: string; source: "portal"; state: "editorial_activity"; formal_completion: false };
export type MicrolearningList = { data: MicrolearningItem[]; pagination: { page: number; page_size: number; total: number; total_pages: number }; error?: boolean };

const apiBase = () => process.env.PORTAL_API_INTERNAL_URL;

export function isMicrolearningSlug(value: string) {
  return value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isAllowedMicrolearningVideoUrl(value?: string) {
  if (!value) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function listMicrolearning(query: string, format: string, page: number): Promise<MicrolearningList> {
  const base = apiBase(); if (!base) return { data: [], pagination: { page, page_size: 9, total: 0, total_pages: 0 }, error: true };
  const params = new URLSearchParams({ q: query.slice(0, 100), page: String(page), page_size: "9" }); if (format) params.set("format", format);
  try { const response = await fetch(`${base}/api/v1/microlearning?${params}`, { next: { revalidate: 60 } }); if (!response.ok) throw new Error(); return response.json() as Promise<MicrolearningList>; }
  catch { return { data: [], pagination: { page, page_size: 9, total: 0, total_pages: 0 }, error: true }; }
}

export async function getMicrolearning(slug: string): Promise<MicrolearningItem | null> {
  if (!isMicrolearningSlug(slug)) return null;
  const base = apiBase(); if (!base) throw new Error("microlearning API unavailable");
  const response = await fetch(`${base}/api/v1/microlearning/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  if (response.status === 404) return null; if (!response.ok) throw new Error("microlearning detail unavailable"); return response.json() as Promise<MicrolearningItem>;
}

export async function getMicrolearningLearnerState(itemId: string) {
  const [base, token] = [apiBase(), await getBackendAccessToken()]; if (!token) return { authenticated: false, progress: null, bookmarked: false }; if (!base) return { authenticated: true, progress: null, bookmarked: false };
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [progressResponse, bookmarksResponse] = await Promise.all([
      fetch(`${base}/api/v1/me/microlearning/${itemId}/progress`, { headers, cache: "no-store" }),
      fetch(`${base}/api/v1/me/bookmarks`, { headers, cache: "no-store" }),
    ]);
    const progress = progressResponse.ok ? await progressResponse.json() as MicrolearningProgress : null;
    const bookmarks = bookmarksResponse.ok ? await bookmarksResponse.json() as { data?: Array<{ target_type: string; target_id: string }> } : {};
    return { authenticated: true, progress, bookmarked: Boolean(bookmarks.data?.some((item) => item.target_type === "microlearning" && item.target_id === itemId)) };
  } catch { return { authenticated: true, progress: null, bookmarked: false }; }
}
