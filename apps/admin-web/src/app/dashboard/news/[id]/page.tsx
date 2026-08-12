"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionNewsAction, getAdminNewsAction } from "@/app/actions/cms";
import { useSession } from "next-auth/react";

export default function AdminNewsDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session }: any = useSession();
  
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await getAdminNewsAction();
        if (!res.success) {
          setError(res.error || "Failed to fetch news");
          return;
        }
        
        const found = res.data?.find((n: any) => n.id === params.id);
        if (found) {
          setNews(found);
        } else {
          setError("News not found");
        }
      } catch (e) {
        setError("Failed to load news");
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, [params.id, session]);

  const handleTransition = async (status: string) => {
    setActionLoading(true);
    setError("");
    const res = await transitionNewsAction(params.id, status);
    if (!res.success) {
      setError(res.error || "Transition failed");
      setActionLoading(false);
    } else {
      router.push("/dashboard/news");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!news) return <div className="p-8 text-red-500">{error || "Not found"}</div>;

  const roles = session?.roles || [];
  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/news" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
            &larr; Back to News Management
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{news.title}</h1>
              <div className="text-slate-500 text-sm mt-1">Status: <span className="font-semibold uppercase">{news.status}</span></div>
            </div>
            
            <div className="flex gap-2">
              {error && <span className="text-red-500 text-sm mr-4 self-center">{error}</span>}
              
              {news.status === 'draft' && isEditor && (
                <button 
                  onClick={() => handleTransition('in_review')} 
                  disabled={actionLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  Submit for Review
                </button>
              )}

              {news.status === 'in_review' && isReviewer && (
                <>
                  <button 
                    onClick={() => handleTransition('draft')} 
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleTransition('approved')} 
                    disabled={actionLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                </>
              )}

              {news.status === 'approved' && isReviewer && (
                <button 
                  onClick={() => handleTransition('published')} 
                  disabled={actionLoading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  Publish
                </button>
              )}

              {news.status === 'published' && (isEditor || isReviewer) && (
                <button 
                  onClick={() => handleTransition('archived')} 
                  disabled={actionLoading}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="font-semibold text-slate-700 mb-2">Excerpt</h3>
            <p className="text-slate-600 mb-6 bg-slate-50 p-4 rounded-md">{news.excerpt || "No excerpt"}</p>
            
            <h3 className="font-semibold text-slate-700 mb-2">Body</h3>
            <div className="prose max-w-none text-slate-600 border border-slate-200 p-4 rounded-md font-mono text-sm bg-slate-50">
              {news.body}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
