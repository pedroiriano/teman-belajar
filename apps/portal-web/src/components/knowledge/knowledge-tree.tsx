import Link from "next/link";

export type PublicKnowledgeNode = {
  id: string;
  parent_id?: string;
  type: "collection" | "aspect" | "indicator" | "sub_indicator" | "topic" | "section";
  slug: string;
  title: string;
  description?: string;
  sort_order: number;
  depth: number;
  article_count: number;
  children: PublicKnowledgeNode[];
};

export type PublicKnowledgeTreeResponse = { data: PublicKnowledgeNode[]; max_depth: number };

function NodeList({ nodes, activeNodeId, nested = false }: { nodes: PublicKnowledgeNode[]; activeNodeId?: string; nested?: boolean }) {
  return <ul className="space-y-1" role={nested ? "group" : "tree"}>{nodes.map((node) => <li key={node.id} role="treeitem" aria-expanded={node.children?.length ? true : undefined} aria-selected={activeNodeId === node.id}>
    <Link href={`/knowledge/topics/${encodeURIComponent(node.id)}`} className={`portal-tree-link ${activeNodeId === node.id ? "is-active" : ""}`} aria-current={activeNodeId === node.id ? "page" : undefined}>
      <span className="min-w-0 flex-1 truncate">{node.title}</span><span className="portal-tree-count">{node.article_count}</span>
    </Link>
    {node.children?.length ? <div className="ml-3 border-l pl-3" style={{ borderColor: "var(--portal-border)" }}><NodeList nodes={node.children} activeNodeId={activeNodeId} nested /></div> : null}
  </li>)}</ul>;
}

export function KnowledgeTree({ nodes, activeNodeId, mobile = false }: { nodes: PublicKnowledgeNode[]; activeNodeId?: string; mobile?: boolean }) {
  const content = nodes.length ? <NodeList nodes={nodes} activeNodeId={activeNodeId} /> : <p className="text-sm leading-6" style={{ color: "var(--portal-muted)" }}>Struktur publik belum tersedia.</p>;
  if (mobile) return <details className="portal-card portal-hierarchy-drawer p-4 lg:hidden"><summary className="flex cursor-pointer list-none items-center justify-between font-extrabold"><span>Jelajahi struktur</span><span aria-hidden="true">⌄</span></summary><div className="mt-4 border-t pt-4" style={{ borderColor: "var(--portal-border)" }}>{content}</div></details>;
  return <aside className="portal-card sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto p-4 lg:block" aria-label="Struktur Pusat Pengetahuan"><p className="portal-eyebrow">Jelajahi</p><h2 className="mt-2 font-black">Struktur pengetahuan</h2><nav className="mt-5" aria-label="Hierarchy pengetahuan">{content}</nav></aside>;
}

export function findKnowledgeNode(nodes: PublicKnowledgeNode[], id?: string, trail: PublicKnowledgeNode[] = []): { node: PublicKnowledgeNode; trail: PublicKnowledgeNode[] } | null {
  if (!id) return null;
  for (const node of nodes) {
    const next = [...trail, node];
    if (node.id === id) return { node, trail: next };
    const nested = findKnowledgeNode(node.children ?? [], id, next);
    if (nested) return nested;
  }
  return null;
}
