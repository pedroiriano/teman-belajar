import "server-only";
import type { MediaUsageInput } from "@/components/media/types";

type EntityType = "news" | "announcement" | "knowledge_revision";

export async function attachMediaUsages(apiBase: string, token: string, entityType: EntityType, entityId: string, usages: MediaUsageInput[]) {
  const unique = Array.from(new Map(usages.map((usage) => [`${usage.media_id}:${usage.usage_role}`, usage])).values());
  const failed: string[] = [];
  for (const usage of unique) {
    const response = await fetch(`${apiBase}/api/v1/admin/media/${usage.media_id}/attach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, usage_role: usage.usage_role, sort_order: usage.sort_order }),
    });
    if (!response.ok) failed.push(usage.media_id);
  }
  return failed;
}
