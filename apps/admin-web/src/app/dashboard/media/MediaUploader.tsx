"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminIcon } from "@/components/admin-icon";

export default function MediaUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/bff/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.title || errorData.error || "Upload failed");
      }

      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="admin-card mb-7 overflow-hidden" aria-labelledby="media-upload-title">
      <div className="border-b border-slate-100 p-5 sm:px-6"><div className="flex items-center gap-3"><span className="admin-stat-icon"><AdminIcon name="media" className="h-5 w-5" /></span><div><h2 id="media-upload-title" className="font-black text-slate-900">Unggah media baru</h2><p className="mt-1 text-xs text-slate-500">Aset divalidasi sebelum tersedia untuk konten.</p></div></div></div>
      <div className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 sm:flex-row sm:items-center">
        <input 
          id="file-upload"
          type="file" 
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="admin-file-input"
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="admin-button disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {uploading ? "Mengunggah…" : "Mulai unggah"}
        </button>
      </div>
      {error && <p className="admin-alert-error mt-4" role="alert">{error}</p>}
      <p className="mt-3 text-xs text-slate-500">JPEG, PNG, WEBP, atau PDF · Maksimum 20 MB · SVG tidak diizinkan.</p>
      </div>
    </section>
  );
}

