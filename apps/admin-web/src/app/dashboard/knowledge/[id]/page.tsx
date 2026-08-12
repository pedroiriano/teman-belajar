"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transitionKnowledgeAction, getAdminKnowledgeDetailAction, createKnowledgeRevisionAction } from "@/app/actions/knowledge";

export default function AdminKnowledgeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
	const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await getAdminKnowledgeDetailAction(params.id);
        if (!res.success) {
          setError(res.error || "Failed to fetch article");
          return;
        }
        
		setArticle(res.data);
		setBody(res.data?.body || "");
		setRoles(res.roles || []);
      } catch (e) {
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [params.id]);

  const handleTransition = async (status: string) => {
    setActionLoading(true);
    setError("");
    const res = await transitionKnowledgeAction(params.id, status);
    if (!res.success) {
      setError(res.error || "Transition failed");
      setActionLoading(false);
    } else {
      router.push("/dashboard/knowledge");
    }
  };

  const handleSaveRevision = async () => {
    setActionLoading(true);
    setError("");
    const res = await createKnowledgeRevisionAction(params.id, { body });
    if (!res.success) {
      setError(res.error || "Revision creation failed");
      setActionLoading(false);
    } else {
      router.push("/dashboard/knowledge");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!article) return <div className="p-8 text-red-500">{error || "Not found"}</div>;

  const isEditor = roles.includes("Content Editor") || roles.includes("Portal Administrator");
  const isReviewer = roles.includes("Reviewer") || roles.includes("Portal Administrator");
  const canCreateRevision = isEditor && ["draft", "published"].includes(article.status);

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/knowledge" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
            &larr; Back to Knowledge Management
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{article.title}</h1>
              <div className="text-slate-500 text-sm mt-1">Status: <span className="font-semibold uppercase">{article.status}</span></div>
            </div>
            
            <div className="flex gap-2">
              {error && <span className="text-red-500 text-sm mr-4 self-center">{error}</span>}
              
              {article.status === 'draft' && isEditor && (
                <button 
                  onClick={() => handleTransition('in_review')} 
                  disabled={actionLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  Submit for Review
                </button>
              )}

              {article.status === 'in_review' && isReviewer && (
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

              {article.status === 'approved' && isReviewer && (
                <button 
                  onClick={() => handleTransition('published')} 
                  disabled={actionLoading}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  Publish
                </button>
              )}

              {article.status === 'published' && (isEditor || isReviewer) && (
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
            <h3 className="font-semibold text-slate-700 mb-2">Summary</h3>
            <p className="text-slate-600 mb-6 bg-slate-50 p-4 rounded-md">{article.summary || "No summary"}</p>
            
            <h3 className="font-semibold text-slate-700 mb-2">Current Body</h3>
            
            {!canCreateRevision ? (
              <div className="prose max-w-none text-slate-600 border border-slate-200 p-4 rounded-md font-mono text-sm bg-slate-50">
                {article.body}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-black font-mono text-sm"
                  rows={15}
                />
                
                {article.body !== body && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveRevision}
                      disabled={actionLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      Save as New Draft Revision
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
