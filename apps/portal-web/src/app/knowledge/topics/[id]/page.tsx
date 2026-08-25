import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHero } from "@/components/public-content";
import { findKnowledgeNode, type PublicKnowledgeNode, type PublicKnowledgeTreeResponse } from "@/components/knowledge/knowledge-tree";

type Article = { id: string; slug: string; title: string; summary?: string };

async function getNode(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const apiBase = process.env.PORTAL_API_INTERNAL_URL; if (!apiBase) throw new Error("Missing PORTAL_API_INTERNAL_URL");
  const [treeResponse, articleResponse] = await Promise.all([
    fetch(`${apiBase}/api/v1/knowledge/tree`, { next: { revalidate: 300 } }),
    fetch(`${apiBase}/api/v1/knowledge?node=${encodeURIComponent(id)}&page_size=100`, { next: { revalidate: 300 } }),
  ]);
  if (!treeResponse.ok || !articleResponse.ok) return null;
  const tree = await treeResponse.json() as PublicKnowledgeTreeResponse; const match = findKnowledgeNode(tree.data || [], id); if (!match) return null;
  const articles = await articleResponse.json() as { data?: Article[] };
  return { ...match, articles: articles.data || [] };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const result = await getNode(id); if (!result) return { title: "Topik tidak ditemukan", robots: { index: false, follow: false } };
  return { title: result.node.title, description: result.node.description || `Jelajahi pengetahuan dalam ${result.node.title}.`, alternates: { canonical: `/knowledge/topics/${result.node.id}` }, robots: { index: result.articles.length >= 2, follow: true } };
}

export default async function KnowledgeTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const result = await getNode(id); if (!result) notFound();
  return <div><PageHero eyebrow="Hierarki Pengetahuan" title={result.node.title} description={result.node.description || "Jelajahi artikel terbit dalam struktur pengetahuan Teman Belajar."} /><section className="portal-container py-12"><nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-2 text-sm text-slate-500"><Link href="/knowledge" className="font-bold text-teal-700">Pusat Pengetahuan</Link>{result.trail.map((node: PublicKnowledgeNode) => <span key={node.id} className="contents"><span aria-hidden="true">/</span><Link href={`/knowledge/topics/${node.id}`} aria-current={node.id === result.node.id ? "page" : undefined} className="hover:text-teal-700">{node.title}</Link></span>)}</nav>{result.articles.length === 0 ? <EmptyState title="Belum ada artikel terbit" description="Node kosong tidak diindeks dan tidak masuk sitemap." /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.articles.map((article) => <article key={article.id} className="portal-card p-6"><h2 className="text-xl font-extrabold text-slate-900"><Link href={`/knowledge/${article.slug}`} className="hover:text-teal-700">{article.title}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary || "Baca artikel pengetahuan selengkapnya."}</p></article>)}</div>}{result.articles.length < 2 && <p className="mt-8 rounded-xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">Node ini tetap noindex sampai memiliki sedikitnya dua artikel terbit yang bernilai.</p>}</section></div>;
}
