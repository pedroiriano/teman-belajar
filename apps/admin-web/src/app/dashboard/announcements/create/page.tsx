"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAnnouncementAction } from "@/app/actions/cms";

export default function CreateAnnouncementPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const parsedStart = startAt ? new Date(startAt) : null;
      const parsedEnd = endAt ? new Date(endAt) : null;
      
      const res = await createAnnouncementAction({ 
        title, 
        slug, 
        body, 
        start_at: parsedStart, 
        end_at: parsedEnd 
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to create announcement");
      }

      router.push("/dashboard/announcements");
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
          <Link href="/dashboard/announcements" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
            &larr; Back to Announcements
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900">Create Announcement</h1>
            <p className="text-slate-500 text-sm mt-1">Draft a new announcement.</p>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">URL Slug <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Start Date</label>
                <input 
                  type="datetime-local" 
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">End Date</label>
                <input 
                  type="datetime-local" 
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Content Body (HTML/Markdown) <span className="text-red-500">*</span></label>
              <textarea 
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm text-black"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm disabled:opacity-50"
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
