export interface PageDaily {
  date: string;
  path: string;
  views: number;
  unique_visitors: number;
}

export interface LearningDaily {
  date: string;
  active_learners: number;
  completions: number;
}

export interface SSODaily {
  date: string;
  successful_logins: number;
  failed_logins: number;
}

export interface APIStats {
  total_requests: string;
  error_rate: string;
  p95_latency: string;
}

export interface StatisticsResponse {
  api: APIStats;
  page_views: PageDaily[];
  learning: LearningDaily[];
  sso: SSODaily[];
}
