import "server-only";

import { getBackendAccessToken } from "@/lib/server-auth";

export type TrainingCourseRef = { moodle_course_id: number; sort_order: number; required: boolean };
export type TrainingCohort = { id: string; label: string; starts_at?: string; ends_at?: string; enrollment_opens_at?: string; enrollment_closes_at?: string; status: "scheduled" | "cancelled" | "completed"; sort_order: number };
export type TrainingProgram = { id: string; slug: string; title: string; summary: string; description: string; audience: string; eligibility_text: string; status: string; version: number; published_at?: string; courses?: TrainingCourseRef[]; cohorts?: TrainingCohort[] };
export type TrainingCourse = { moodle_course_id: number; short_name?: string; full_name?: string; summary?: string; category?: string; required: boolean; availability: "available" | "unavailable"; learner_state?: "enrolled" | "completed" | "not_enrolled"; progress?: number; start_url?: string };
export type TrainingProvenance = { source: "moodle"; checked_at: string; state: "fresh" | "degraded"; detail?: string };
export type TrainingDetail = { program: TrainingProgram; courses: TrainingCourse[]; provenance: TrainingProvenance };
export type TrainingProgress = { program_slug: string; courses: TrainingCourse[]; completed_courses: number; enrolled_courses: number; total_courses: number; progress_percent?: number; eligibility: { status: "confirmed" | "partial" | "unverified"; message: string }; cta: { kind: "start" | "review" | "check_access" | "unavailable"; label: string; url?: string }; provenance: TrainingProvenance };
export type TrainingList = { data: TrainingProgram[]; pagination: { page: number; page_size: number; total: number; total_pages: number }; error?: true };
export type CourseStarDistribution = { count: number; percentage: number };
export type CourseRatingSummary = {
  average_rating: number;
  total_reviews: number;
  distribution: Record<number, CourseStarDistribution>;
};
export type CourseReview = {
  id: string;
  program_id: string;
  program_slug: string;
  moodle_course_id?: number;
  user_subject: string;
  author_name: string;
  rating: number;
  title: string;
  content: string;
  status: "published" | "hidden" | "flagged";
  created_at: string;
  updated_at: string;
};
export type CourseReviewListResult = {
  summary: CourseRatingSummary;
  reviews: CourseReview[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

function apiBase() { return process.env.PORTAL_API_INTERNAL_URL; }

export function isTrainingProgramSlug(value: string) {
  return value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export async function listTrainingPrograms(query: string, page: number): Promise<TrainingList> {
  const base = apiBase();
  if (!base) return { data: [], pagination: { page: 1, page_size: 9, total: 0, total_pages: 0 }, error: true };
  const params = new URLSearchParams({ q: query.slice(0, 100), page: String(page), page_size: "9" });
  try {
    const response = await fetch(`${base}/api/v1/training-programs?${params}`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error("training list unavailable");
    return response.json() as Promise<TrainingList>;
  } catch {
    return { data: [], pagination: { page, page_size: 9, total: 0, total_pages: 0 }, error: true };
  }
}

export async function getTrainingProgram(slug: string): Promise<TrainingDetail | null> {
  const base = apiBase();
  if (!base) throw new Error("training API base is unavailable");
  // Detail must reflect publish/archive transitions immediately. A stale cached
  // response can otherwise keep an archived program publicly readable.
  const response = await fetch(`${base}/api/v1/training-programs/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("training detail unavailable");
  return response.json() as Promise<TrainingDetail>;
}

export async function getTrainingProgress(slug: string): Promise<{ authenticated: boolean; data: TrainingProgress | null }> {
  const [base, token] = [apiBase(), await getBackendAccessToken()];
  if (!token) return { authenticated: false, data: null };
  if (!base) return { authenticated: true, data: null };
  try {
    const response = await fetch(`${base}/api/v1/learning/me/training-programs/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return { authenticated: true, data: response.ok ? await response.json() : null };
  } catch { return { authenticated: true, data: null }; }
}

export async function getRelatedTrainingPrograms(currentSlug: string, limit = 3): Promise<TrainingProgram[]> {
  try {
    const list = await listTrainingPrograms("", 1);
    return (list.data || []).filter((item) => item.slug !== currentSlug).slice(0, limit);
  } catch {
    return [];
  }
}

export type CohortEnrollmentState = {
  status: "open" | "upcoming" | "closed" | "completed" | "cancelled";
  label: string;
  badgeClass: string;
  canEnroll: boolean;
};

export function getCohortEnrollmentState(cohort: TrainingCohort, now = new Date()): CohortEnrollmentState {
  if (cohort.status === "cancelled") {
    return {
      status: "cancelled",
      label: "Dibatalkan",
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
      canEnroll: false,
    };
  }
  if (cohort.status === "completed") {
    return {
      status: "completed",
      label: "Selesai",
      badgeClass: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      canEnroll: false,
    };
  }

  const nowTime = now.getTime();
  const opensAt = cohort.enrollment_opens_at ? new Date(cohort.enrollment_opens_at).getTime() : null;
  const closesAt = cohort.enrollment_closes_at ? new Date(cohort.enrollment_closes_at).getTime() : null;

  if (closesAt && nowTime > closesAt) {
    return {
      status: "closed",
      label: "Pendaftaran Ditutup",
      badgeClass: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      canEnroll: false,
    };
  }

  if (opensAt && nowTime < opensAt) {
    return {
      status: "upcoming",
      label: "Segera Dibuka",
      badgeClass: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
      canEnroll: false,
    };
  }

  if (opensAt || closesAt) {
    return {
      status: "open",
      label: "Pendaftaran Dibuka",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
      canEnroll: true,
    };
  }

  return {
    status: "open",
    label: "Terjadwal",
    badgeClass: "bg-primary/10 text-primary border border-primary/20",
    canEnroll: true,
  };
}

export function getProgramEnrollmentSummary(cohorts?: TrainingCohort[], now = new Date()): {
  hasOpenCohort: boolean;
  label: string;
  className: string;
} {
  if (!cohorts || cohorts.length === 0) {
    return {
      hasOpenCohort: false,
      label: "Jadwal Belum Dibuka",
      className: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    };
  }

  const states = cohorts.map(c => getCohortEnrollmentState(c, now));
  const openCohort = states.find(s => s.status === "open");

  if (openCohort) {
    return {
      hasOpenCohort: true,
      label: openCohort.label === "Terjadwal" ? "Jadwal Aktif" : "Pendaftaran Dibuka",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    };
  }

  const upcomingCohort = states.find(s => s.status === "upcoming");
  if (upcomingCohort) {
    return {
      hasOpenCohort: false,
      label: "Segera Dibuka",
      className: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    };
  }

  return {
    hasOpenCohort: false,
    label: "Pendaftaran Ditutup",
    className: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };
}

export async function getTrainingProgramReviews(slug: string, page = 1): Promise<CourseReviewListResult | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/api/v1/training-programs/${encodeURIComponent(slug)}/reviews?page=${page}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json() as Promise<CourseReviewListResult>;
  } catch {
    return null;
  }
}

export async function getMyTrainingProgramReview(slug: string): Promise<CourseReview | null> {
  const [base, token] = [apiBase(), await getBackendAccessToken()];
  if (!base || !token) return null;
  try {
    const response = await fetch(`${base}/api/v1/training-programs/${encodeURIComponent(slug)}/reviews/my`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json() as Promise<CourseReview>;
  } catch {
    return null;
  }
}

export type ProgramVisualMetadata = {
  image: string;
  category: string;
  level: "Pemula" | "Menengah" | "Mahir";
  instructor: { name: string; avatar?: string; role?: string };
  durationLabel: string;
};

const visualMetadataMap: Record<string, ProgramVisualMetadata> = {
  "arsitektur-cloud-enterprise": {
    image: "/techwind-hero/course/c1.jpg",
    category: "Cloud & DevOps",
    level: "Mahir",
    instructor: { name: "Tim Arsitek Cloud", avatar: "/techwind-hero/client/01.jpg", role: "Principal Cloud Engineer" },
    durationLabel: "8 Minggu",
  },
  "fullstack-modern-web": {
    image: "/techwind-hero/course/c2.jpg",
    category: "Software Engineering",
    level: "Menengah",
    instructor: { name: "Budi Pratama", avatar: "/techwind-hero/client/02.jpg", role: "Staff Software Engineer" },
    durationLabel: "10 Minggu",
  },
  "data-science-ai-enterprise": {
    image: "/techwind-hero/course/c3.jpg",
    category: "Data & AI",
    level: "Menengah",
    instructor: { name: "Dr. Citra Kirana", avatar: "/techwind-hero/client/03.jpg", role: "Lead Data Scientist" },
    durationLabel: "12 Minggu",
  },
  "cybersecurity-incident-defense": {
    image: "/techwind-hero/course/c4.jpg",
    category: "Keamanan Siber",
    level: "Mahir",
    instructor: { name: "Ir. Kurniawan", avatar: "/techwind-hero/client/04.jpg", role: "Head of Security Ops" },
    durationLabel: "6 Minggu",
  },
  "ui-ux-design-system-mastery": {
    image: "/techwind-hero/course/c5.jpg",
    category: "UI/UX & Desain",
    level: "Pemula",
    instructor: { name: "Siti Rahmawati", avatar: "/techwind-hero/client/05.jpg", role: "Design Systems Lead" },
    durationLabel: "8 Minggu",
  },
  "manajemen-proyek-agile": {
    image: "/techwind-hero/course/c6.jpg",
    category: "Manajemen Proyek",
    level: "Menengah",
    instructor: { name: "Hendro Susanto, PMP", avatar: "/techwind-hero/client/06.jpg", role: "Agile Delivery Coach" },
    durationLabel: "6 Minggu",
  },
};

export function getProgramVisualMetadata(slug: string): ProgramVisualMetadata {
  return (
    visualMetadataMap[slug] || {
      image: "/techwind-hero/course/c1.jpg",
      category: "Program Pelatihan",
      level: "Menengah",
      instructor: { name: "Fasilitator Teman Belajar", avatar: "/techwind-hero/client/01.jpg", role: "Instruktur Resmi" },
      durationLabel: "8 Minggu",
    }
  );
}

export type EnrichedTrainingProgram = TrainingProgram & {
  visual: ProgramVisualMetadata;
  rating?: { average: number; totalReviews: number };
};

export type EnrichedTrainingList = {
  data: EnrichedTrainingProgram[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
  error?: true;
};

export async function listTrainingProgramsWithReviews(query: string, page: number): Promise<EnrichedTrainingList> {
  const list = await listTrainingPrograms(query, page);
  if (!list.data || list.data.length === 0) {
    return { data: [], pagination: list.pagination, error: list.error };
  }

  const enrichedData: EnrichedTrainingProgram[] = await Promise.all(
    list.data.map(async (program) => {
      const visual = getProgramVisualMetadata(program.slug);
      try {
        const reviewData = await getTrainingProgramReviews(program.slug);
        const rating = reviewData?.summary?.total_reviews
          ? { average: reviewData.summary.average_rating, totalReviews: reviewData.summary.total_reviews }
          : undefined;
        return { ...program, visual, rating };
      } catch {
        return { ...program, visual };
      }
    })
  );

  return {
    data: enrichedData,
    pagination: list.pagination,
    error: list.error,
  };
}
