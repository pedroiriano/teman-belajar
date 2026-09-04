export interface DashboardKPI {
  total_published: number;
  total_draft: number;
  pending_review: number;
  active_programs: number;
}

export interface ModuleStatusCounts {
  published: number;
  draft: number;
  in_review: number;
}

export interface ContentBreakdown {
  knowledge: ModuleStatusCounts;
  news: ModuleStatusCounts;
  announcements: ModuleStatusCounts;
  faqs: ModuleStatusCounts;
  microlearning: ModuleStatusCounts;
  training: ModuleStatusCounts;
  learning_paths: ModuleStatusCounts;
}

export interface ReviewQueueItem {
  id: string;
  title: string;
  module: string;
  status: string;
  author: string;
  updated_at: string;
}

export interface DashboardSummaryResponse {
  kpi: DashboardKPI;
  content_breakdown: ContentBreakdown;
  review_queue: ReviewQueueItem[];
  generated_at: string;
}
