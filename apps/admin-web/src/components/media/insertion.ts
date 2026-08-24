import type { MediaSelection, MediaUsageInput } from "./types";

function escapeMarkdownLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function mediaMarkdown(selection: MediaSelection) {
  const url = `/api/v1/media/${selection.id}/content`;
  if (selection.detected_mime_type === "application/pdf") {
    const label = selection.title?.trim() || selection.display_filename || selection.original_filename || "Buka dokumen PDF";
    return `[${escapeMarkdownLabel(label)}](${url})`;
  }
  const alt = selection.decorative ? "" : selection.insertion_alt_text.trim();
  if (!selection.decorative && !alt) throw new Error("Teks alternatif wajib diisi untuk gambar.");
  return `![${escapeMarkdownLabel(alt)}](${url})`;
}

export function usageFor(selection: MediaSelection, sortOrder: number): MediaUsageInput {
  return { media_id: selection.id, usage_role: selection.detected_mime_type === "application/pdf" ? "attachment" : "inline", sort_order: sortOrder };
}


export function mediaUsagesFromMarkdown(body: string): MediaUsageInput[] {
  const pattern = /(!?)\[(?:\\.|[^\]])*\]\(\/api\/v1\/media\/([0-9a-f-]{36})\/content\)/gi;
  const seen = new Set<string>();
  const usages: MediaUsageInput[] = [];
  for (const match of body.matchAll(pattern)) {
    const mediaId = match[2].toLowerCase();
    const role = match[1] === "!" ? "inline" : "attachment";
    const key = `${mediaId}:${role}`;
    if (seen.has(key)) continue;
    seen.add(key); usages.push({ media_id: mediaId, usage_role: role, sort_order: usages.length });
  }
  return usages;
}
