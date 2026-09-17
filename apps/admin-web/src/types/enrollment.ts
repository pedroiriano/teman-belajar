export type EnrollmentStatus = "pending" | "confirmed" | "rejected" | "completed";

export interface EnrollmentApplication {
  id: string;
  user_subject: string;
  user_name: string;
  user_email: string;
  program_slug: string;
  program_title: string;
  cohort_id?: string;
  cohort_label?: string;
  moodle_course_id?: number;
  moodle_course_name?: string;
  status: EnrollmentStatus;
  notes?: string;
  rejection_reason?: string;
  applied_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
}

export interface EnrollmentMetrics {
  total: number;
  pending: number;
  confirmed: number;
  rejected: number;
}

export interface EnrollmentFilter {
  status?: string;
  program_slug?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface EnrollmentListResponse {
  enrollments: EnrollmentApplication[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  metrics: EnrollmentMetrics;
}

export interface ManualEnrollInput {
  user_name: string;
  user_email: string;
  program_slug: string;
  cohort_id?: string;
  notes?: string;
}
