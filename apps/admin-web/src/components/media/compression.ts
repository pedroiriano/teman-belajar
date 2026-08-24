const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;
const SCALE_STEP = 0.85;
const MAX_ATTEMPTS = 12;

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
}

export async function compressImage(file: File, maxBytes: number): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Hanya gambar yang dapat dikompresi.");
  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    let quality = 0.9;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const context = canvas.getContext("2d", { alpha: file.type === "image/png" });
      if (!context) throw new Error("Browser tidak menyediakan pemrosesan gambar yang diperlukan.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas, file.type, file.type === "image/png" ? undefined : quality);
      if (!blob) throw new Error("Browser gagal menghasilkan gambar terkompresi.");
      if (blob.size <= maxBytes) return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
      if (file.type !== "image/png" && quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
      else { width *= SCALE_STEP; height *= SCALE_STEP; }
    }
    throw new Error("Gambar tidak dapat diperkecil ke batas 2,5 MiB tanpa menurunkan kualitas secara berlebihan.");
  } finally {
    bitmap.close();
  }
}
