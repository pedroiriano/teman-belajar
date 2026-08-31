import "server-only";

export type AuditEvent = {
  id: string;
  actor_user_id?: string;
  event: string;
  module: string;
  target_type: string;
  target_id: string;
  result: string;
  correlation_id?: string;
  ip_masked?: string;
  metadata?: Record<string, string>;
  occurred_at: string;
};

export type AuditPage = { items: AuditEvent[]; next_cursor?: string };

export const auditQueryKeys = ["actor", "event", "module", "target_type", "target_id", "result", "correlation_id", "from", "to"] as const;

export function safeAuditParams(input: Record<string, string | string[] | undefined>) {
  const output = new URLSearchParams();
  for (const key of auditQueryKeys) {
    const value = input[key];
    if (typeof value === "string" && value.length <= 255) output.set(key, value);
  }
  if (typeof input.cursor === "string" && input.cursor.length <= 256) output.set("cursor", input.cursor);
  output.set("limit", "25");
  return output;
}

export function auditTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Waktu tidak valid" : date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}
