export type EngagementTargetType = "knowledge";

export type EngagementItem = {
  target_type: EngagementTargetType;
  target_id: string;
  title: string;
  summary?: string;
  url: string;
  category_id?: string;
  tags: string[];
  published_at?: string;
  bookmarked?: boolean;
  rating?: number;
  created_at?: string;
  last_viewed_at?: string;
  view_count?: number;
};

export type RatingSummary = {
  average: number;
  count: number;
  current_user_rating?: number;
};

export type Recommendation = EngagementItem & {
  reason: "same_category" | "recent_interest" | "popular_rating" | "fallback_recent";
};

export type RecommendationList = {
  data: Recommendation[];
  personalized: boolean;
};

export type EngagementList = { data: EngagementItem[] };
