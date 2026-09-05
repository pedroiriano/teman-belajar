import type { Recommendation } from "@/lib/engagement/types";

export interface CuratedRecommendationsResult {
  data: Recommendation[];
  personalized: boolean;
  error?: boolean;
}

export async function getCuratedRecommendations(
  limit: number = 6,
  contentType: string = "knowledge"
): Promise<CuratedRecommendationsResult> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) {
    return { data: [], personalized: false, error: true };
  }

  try {
    const res = await fetch(
      `${apiBase}/api/v1/recommendations?limit=${limit}&content_type=${encodeURIComponent(contentType)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return { data: [], personalized: false, error: true };
    }
    const payload = await res.json();
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      personalized: Boolean(payload.personalized),
    };
  } catch {
    return { data: [], personalized: false, error: true };
  }
}
