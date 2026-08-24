export type KnowledgeNodeType = "collection" | "aspect" | "indicator" | "sub_indicator" | "topic" | "section";
export type KnowledgeNodeStatus = "active" | "archived";

export type KnowledgeNode = {
  id: string;
  parent_id?: string;
  type: KnowledgeNodeType;
  slug: string;
  title: string;
  description?: string;
  sort_order: number;
  status: KnowledgeNodeStatus;
  version: number;
  depth: number;
  article_count: number;
  children: KnowledgeNode[];
};

export type KnowledgeHierarchyResponse = {
  data: KnowledgeNode[];
  max_depth: number;
};

export type KnowledgeNodeInput = {
  parent_id: string | null;
  type: KnowledgeNodeType;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
};

export type KnowledgeBreadcrumb = { id: string; slug: string; title: string; type: KnowledgeNodeType };
export type ArticleHierarchy = { node_id: string; breadcrumbs: KnowledgeBreadcrumb[] };

export const knowledgeNodeTypeLabels: Record<KnowledgeNodeType, string> = {
  collection: "Koleksi",
  aspect: "Aspek",
  indicator: "Indikator",
  sub_indicator: "Subindikator",
  topic: "Topik",
  section: "Bagian",
};

export function flattenKnowledgeNodes(nodes: KnowledgeNode[], prefix: KnowledgeNode[] = []): Array<{ node: KnowledgeNode; path: string }> {
  return nodes.flatMap((node) => {
    const path = [...prefix, node];
    return [{ node, path: path.map((item) => item.title).join(" / ") }, ...flattenKnowledgeNodes(node.children ?? [], path)];
  });
}
