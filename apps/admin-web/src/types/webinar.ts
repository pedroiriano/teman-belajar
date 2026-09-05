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

export interface AdminWebinarListResponse {
  items: AdminWebinarItem[];
  total: number;
}
