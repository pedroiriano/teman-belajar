import type { Metadata } from "next";
import { getTaxonomyLanding, TaxonomyLanding } from "@/components/taxonomy-landing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const landing = await getTaxonomyLanding("tags", slug);
  if (!landing) return { title: "Tag tidak ditemukan", robots: { index: false, follow: false } };
  return { title: landing.term.name, description: landing.term.description, alternates: { canonical: `/tags/${landing.term.slug}` }, robots: { index: landing.indexable, follow: true } };
}
export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <TaxonomyLanding kind="tags" slug={slug} />; }
