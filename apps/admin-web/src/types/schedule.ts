export type ScheduleModule =
  | "Pelatihan"
  | "Microlearning"
  | "Pengetahuan"
  | "Pengumuman"
  | "Berita";

export type ScheduleStatus =
  | "scheduled"
  | "published"
  | "needs_review"
  | "ready"
  | "cancelled"
  | "failed";

export interface ScheduleEvent {
  id: string;
  title: string;
  module: ScheduleModule;
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:MM (Asia/Jakarta / WIB)
  status: ScheduleStatus;
  statusLabel: string;
  owner: string;
  entityId?: string;
  entityType?: string;
  cohortLabel?: string;
  participantsCount?: number;
  hasConflict?: boolean;
  conflictDetails?: string;
  description?: string;
  executedAt?: string;
  failureReason?: string;
}

export interface CreateScheduleInput {
  title: string;
  module: ScheduleModule;
  targetDate: string;
  targetTime: string;
  owner: string;
  entityId?: string;
  entityType?: string;
  cohortLabel?: string;
  participantsCount?: number;
  description?: string;
}

export interface ScheduleCandidate {
  id: string;
  title: string;
  entity_type: string;
  module: ScheduleModule;
  status: string;
  updated_at: string;
  author_name?: string;
}

