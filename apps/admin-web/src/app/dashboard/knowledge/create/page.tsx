"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createKnowledgeAction } from "@/app/actions/knowledge";

import MediaPicker from "@/components/media/MediaPicker";

export default function CreateKnowledgePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const insertMedia = (mediaId: string) => {
    const mediaMarkdown = `\n![Media](/api/v1/media/${mediaId}/content)\n`;
    setBody((prev) => prev + mediaMarkdown);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createKnowledgeAction({ title, slug, summary, body });

      if (!res.success) {
        throw new Error(res.error || "Failed to create knowledge article");
      }

      router.push("/dashboard/knowledge");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/knowledge" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
            &larr; Back to Knowledge Management
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900">Create Knowledge Article</h1>
            <p className="text-slate-500 text-sm mt-1">Draft a new article. It will start in &apos;draft&apos; status.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-black"
                  placeholder="e.g., Platform Update Q3"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">URL Slug <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
            <label htmlFor="summary" className="block text-sm font-medium text-slate-700">
              Summary
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              rows={3}
              placeholder="Brief summary..."
            />
          </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">Isi artikel <span className="text-red-500">*</span></label>
                <MediaPicker onSelect={insertMedia} buttonLabel="Sisipkan Media" />
              </div>
              <textarea 
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-black"
                placeholder="Tulis panduan atau pengetahuan dalam teks yang terstruktur..."
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center"
              >
                {loading ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
