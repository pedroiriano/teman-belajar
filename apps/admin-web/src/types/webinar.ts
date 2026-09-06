export interface AdminWebinarItem {
  id: number;
  title: string;
  description?: string;
  speaker: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number;
  enrolled_count: number;
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  join_url?: string;
  recording_url?: string;
  provider: "zoom" | "bigbluebutton" | "manual";
  provider_ready: boolean;
}

export interface AdminWebinarAttendee {
  name: string;
  email: string;
  registered_at: string;
  attendance_state: "present" | "absent" | "registered";
  attended_minutes?: number;
}

export interface AdminWebinarDetailItem extends AdminWebinarItem {
  attendance_seconds?: number;
  attendance_state?: "pending" | "synced";
  synced_at?: string;
  course_id?: number;
  attendees?: AdminWebinarAttendee[];
}

export interface AdminWebinarListResponse {
  items: AdminWebinarItem[];
  total: number;
}

export interface CreateAdminWebinarInput {
  title: string;
  description?: string;
  speaker: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  join_url?: string;
}
