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
  | "ready";

export interface ScheduleEvent {
  id: string;
  title: string;
  module: ScheduleModule;
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:MM (Asia/Jakarta / WIB)
  status: ScheduleStatus;
  statusLabel: string;
  owner: string;
  cohortLabel?: string;
  participantsCount?: number;
  hasConflict?: boolean;
  conflictDetails?: string;
  description?: string;
}

export interface CreateScheduleInput {
  title: string;
  module: ScheduleModule;
  targetDate: string;
  targetTime: string;
  owner: string;
  cohortLabel?: string;
  participantsCount?: number;
  description?: string;
}
