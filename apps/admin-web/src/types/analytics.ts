export interface PageDaily {
  date: string;
  path: string;
  views: number;
  unique_visitors: number;
}

export interface CourseUtilization {
  course_id: number;
  course_name: string;
  accesses: number;
  unique_learners: number;
}

export interface LearningDaily {
  date: string;
  active_learners: number;
  learning_starts: number;
  completions: number;
  completion_rate: number;
  top_courses: CourseUtilization[];
}

export interface SSODaily {
  date: string;
  successful_logins: number;
  failed_logins: number;
}

export interface SearchDaily {
  date: string;
  total_searches: number;
  zero_results: number;
  result_clicks: number;
}

export interface ContentDaily {
  date: string;
  content_type: string;
  target_id: string;
  views: number;
  unique_visitors: number;
}

export interface EngagementStats {
  bookmarks: number;
  ratings: number;
  avg_rating: number;
}

export interface PromValue {
  value: string;
  available: boolean;
}

export interface APIStats {
  request_rate: PromValue;
  error_rate: PromValue;
  p50_latency: PromValue;
  p95_latency: PromValue;
  p99_latency: PromValue;
  status_2xx: PromValue;
  status_4xx: PromValue;
  status_5xx: PromValue;
}

export interface Freshness {
  analytics_last_rollup: string;
  prometheus_observed_at: string;
}

export interface StatisticsResponse {
  api: APIStats;
  page_views: PageDaily[];
  learning: LearningDaily[];
  sso: SSODaily[];
  search: SearchDaily[];
  content: ContentDaily[];
  engagement: EngagementStats;
  period_unique_visitors: number;
  freshness: Freshness;
}
