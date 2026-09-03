import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, EditorialCard, EmptyState, PageHero } from "@/components/techwind";
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
  return <div><PageHero eyebrow="Hierarki Pengetahuan" title={result.node.title} description={result.node.description || "Jelajahi artikel terbit dalam struktur pengetahuan Teman Belajar."} icon="book" /><Breadcrumb items={[{ href: "/", label: "Beranda" }, { href: "/knowledge", label: "Pusat Pengetahuan" }, ...result.trail.map((node: PublicKnowledgeNode) => ({ href: node.id === result.node.id ? undefined : `/knowledge/topics/${node.id}`, label: node.title }))]} /><section className="portal-container py-10 sm:py-14">{result.articles.length === 0 ? <EmptyState title="Belum ada artikel terbit" description="Node kosong tidak diindeks dan tidak masuk sitemap." /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.articles.map((article) => <EditorialCard key={article.id} href={`/knowledge/${article.slug}`} title={article.title} summary={article.summary} />)}</div>}{result.articles.length < 2 && <p className="mt-8 rounded-xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">Node ini tetap noindex sampai memiliki sedikitnya dua artikel terbit yang bernilai.</p>}</section></div>;
}
