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
  eligible_enrolments: number;
  completions: number;
  completion_rate: number;
  top_courses: CourseUtilization[];
}

export interface PeriodLearningStats {
  active_learners: number;
  learning_starts: number;
  eligible_enrolments: number;
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
  value: number | null;
  available: boolean;
  reason?: "no_data" | "unavailable" | "invalid_value" | "invalid_response" | "invalid_request";
  observed_at: string | null;
}

export interface SourceState {
  status: "fresh" | "stale" | "unavailable" | "empty";
  observed_at: string | null;
  reason?: string;
}

export interface APIStats {
  request_rate: PromValue;
  error_rate: PromValue;
  p50_latency: PromValue;
  p95_latency: PromValue;
  p99_latency: PromValue;
  status_2xx: PromValue;
  status_3xx: PromValue;
  status_4xx: PromValue;
  status_5xx: PromValue;
  availability: PromValue;
  source: SourceState;
}

export interface StatisticsSources {
  analytics: SourceState;
  moodle: SourceState;
  prometheus: SourceState;
}

export interface PeriodUniqueVisitors {
  value: number | null;
  available: boolean;
  reason?: "retention_limit" | "analytics_query_failed";
}

export interface StatisticsResponse {
  api: APIStats;
  page_views: PageDaily[];
  learning: LearningDaily[];
  learning_period: PeriodLearningStats | null;
  sso: SSODaily[];
  search: SearchDaily[];
  content: ContentDaily[];
  engagement: EngagementStats | null;
  engagement_scope: "all_time_current_state";
  period_unique_visitors: PeriodUniqueVisitors;
  sources: StatisticsSources;
}
