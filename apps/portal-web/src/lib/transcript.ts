export interface TranscriptSummary {
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  total_learning_hours: number;
  average_score: number;
  total_certificates: number;
}

export interface TranscriptCourseItem {
  course_id: number;
  course_name: string;
  short_name: string;
  category: string;
  completed: boolean;
  progress: number;
  final_grade: string;
  certificate_code?: string;
  verification_url?: string;
  completed_at?: number;
}

export interface TranscriptLearnerInfo {
  name: string;
  username: string;
  email: string;
}

export interface LearnerTranscript {
  document_number: string;
  issued_at: number;
  institution: string;
  learner: TranscriptLearnerInfo;
  summary: TranscriptSummary;
  courses: TranscriptCourseItem[];
}

export interface LearnerTranscriptResponse {
  data: LearnerTranscript;
}

export async function getLearnerTranscript(token: string): Promise<LearnerTranscript | null> {
  const apiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://127.0.0.1:8180";
  try {
    const res = await fetch(`${apiUrl}/api/v1/learning/me/transcript`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const payload: LearnerTranscriptResponse = await res.json();
    return payload.data ?? null;
  } catch (err) {
    console.error("getLearnerTranscript failed:", err);
    return null;
  }
}
