export type TaxonomyTerm = { id: string; slug: string; name: string; description?: string };

export type PublicSEO = {
  content_type: "news" | "announcement" | "knowledge";
  content_id: string;
  slug: string;
  title: string;
  description: string;
  canonical_path: string;
  indexable: boolean;
  open_graph_title: string;
  open_graph_description: string;
  open_graph_image_url?: string;
  open_graph_image_alt?: string;
  category?: TaxonomyTerm;
  tags: TaxonomyTerm[];
  published_at?: string;
  updated_at: string;
};

export type DiscoveryLanding = { term: TaxonomyTerm & { usage_count: number }; indexable: boolean; items: Array<{ content_type: string; slug: string; title: string; summary: string; url: string; updated_at: string }> };

export const absolutePublicUrl = (path: string) => new URL(path, process.env.PORTAL_PUBLIC_BASE_URL || "http://localhost:3000").toString();

export const metadataFromSEO = (seo: PublicSEO | undefined, fallback: { title: string; description?: string; canonical: string }) => ({
  title: seo?.title || fallback.title,
  description: seo?.description || fallback.description,
  alternates: { canonical: seo?.canonical_path || fallback.canonical },
  robots: seo?.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "article" as const,
    title: seo?.open_graph_title || seo?.title || fallback.title,
    description: seo?.open_graph_description || seo?.description || fallback.description,
    url: seo?.canonical_path || fallback.canonical,
    images: seo?.open_graph_image_url ? [{ url: seo.open_graph_image_url, alt: seo.open_graph_image_alt || "Teman Belajar" }] : undefined,
  },
});
