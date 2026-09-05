export type MoodleEventStatus = "pending" | "processing" | "processed" | "dead_letter";

export interface MoodleEventSummary {
  pending: number;
  processing: number;
  processed: number;
  dead_letter: number;
  total: number;
}

export interface MoodleInboxEvent {
  id: number;
  event_id: string;
  event_type: string;
  source: string;
  subject_id: string;
  occurred_at: string;
  schema_version: string;
  payload: Record<string, unknown>;
  fingerprint: string;
  status: MoodleEventStatus;
  attempts: number;
  next_attempt_at?: string | null;
  error_category?: string | null;
  received_at: string;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoodleEventFilter {
  status?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}

export interface MoodleEventListResponse {
  items: MoodleInboxEvent[];
  total: number;
  limit: number;
  offset: number;
}
