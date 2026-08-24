import type { MediaPolicy } from "./types";

export function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function validateClientFile(file: File, policy: MediaPolicy): string | null {
  const extension = extensionOf(file.name);
  const expectedMime = policy.extension_mime_types[extension];
  if (!expectedMime || !policy.allowed_extensions.includes(extension)) return "Ekstensi berkas tidak diizinkan.";
  if (!policy.allowed_mime_types.includes(file.type) || file.type !== expectedMime) return "Jenis berkas browser tidak cocok dengan ekstensi.";
  if (file.size < 1 || file.size > policy.max_object_bytes) return "Ukuran berkas melewati batas absolut 20 MiB.";
  return null;
}

export function needsCompression(file: File, policy: MediaPolicy) {
  return file.type.startsWith("image/") && file.size > policy.max_image_bytes;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
