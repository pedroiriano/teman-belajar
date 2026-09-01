export type MediaAsset = {
  id: string;
  display_filename: string | null;
  original_filename: string | null;
  detected_mime_type: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  size_bytes: number;
  status: "active" | "archived";
  created_at: string;
};

export type MediaPolicy = {
  allowed_extensions: string[];
  allowed_mime_types: string[];
  extension_mime_types: Record<string, string>;
  max_image_bytes: number;
  max_image_source_bytes: number;
  max_document_bytes: number;
  max_video_bytes: number;
  max_object_bytes: number;
  max_multipart_bytes: number;
};

export type MediaSelection = MediaAsset & {
  insertion_alt_text: string;
  decorative: boolean;
};

export type MediaUsageInput = { media_id: string; usage_role: "inline" | "attachment"; sort_order: number };
