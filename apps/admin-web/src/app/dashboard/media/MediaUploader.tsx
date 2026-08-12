"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload Media Baru</h2>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <input 
          id="file-upload"
          type="file" 
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100
          "
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="admin-button disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {uploading ? "Mengunggah..." : "Mulai Unggah"}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-slate-500 text-xs mt-2">Mendukung: JPEG, PNG, WEBP, PDF (Maks 20MB). SVG DILARANG.</p>
    </div>
  );
}
