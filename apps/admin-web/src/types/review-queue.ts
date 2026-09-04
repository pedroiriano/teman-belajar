export type ReviewModule =
  | "knowledge"
  | "news"
  | "announcements"
  | "faqs"
  | "microlearning"
  | "training"
  | "learning_paths";

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export interface ReviewQueueItem {
  id: string;
  title: string;
  module: ReviewModule | string;
  status: ReviewStatus | string;
  author: string;
  updated_at: string;
}

export interface ReviewQueueKPI {
  pending_review: number;
  approved: number;
  needs_revision: number;
  total: number;
}

export interface TransitionReviewPayload {
  id: string;
  module: ReviewModule | string;
  targetStatus: ReviewStatus | string;
  title?: string;
  reviewerNotes?: string;
}

export interface TransitionReviewResult {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    module: string;
    previousStatus: string;
    newStatus: string;
    updatedAt: string;
    reviewerNotes?: string;
  };
}

export const reviewModuleLabels: Record<string, string> = {
  knowledge: "Pusat Pengetahuan",
  news: "Berita",
  announcements: "Pengumuman",
  faqs: "FAQ",
  microlearning: "Pembelajaran Singkat",
  training: "Program Pelatihan",
  learning_paths: "Jalur Belajar",
};

export const reviewModuleHrefs: Record<string, (id: string) => string> = {
  knowledge: (id) => `/dashboard/knowledge/${id}`,
  news: (id) => `/dashboard/news/${id}`,
  announcements: (id) => `/dashboard/announcements/${id}`,
  faqs: () => `/dashboard/faqs`,
  microlearning: () => `/dashboard/microlearning`,
  training: () => `/dashboard/training-programs`,
  learning_paths: () => `/dashboard/learning-paths`,
};

export const reviewStatusLabels: Record<string, string> = {
  draft: "Draf",
  in_review: "Menunggu Peninjauan",
  approved: "Disetujui",
  published: "Terbit",
  archived: "Diarsipkan",
};

export const reviewStatusBadgeClasses: Record<string, string> = {
  in_review: "cuba-badge-warning",
  approved: "cuba-badge-primary",
  published: "cuba-badge-success",
  draft: "cuba-badge-neutral",
  archived: "cuba-badge-neutral",
};
