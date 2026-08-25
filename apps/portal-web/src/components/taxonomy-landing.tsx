import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHero, formatDate } from "@/components/public-content";
import type { DiscoveryLanding } from "@/lib/discovery/types";

export async function getTaxonomyLanding(kind: "categories" | "tags", slug: string): Promise<DiscoveryLanding | null> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) throw new Error("Missing PORTAL_API_INTERNAL_URL");
  const response = await fetch(`${apiBase}/api/v1/discovery/${kind}/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load taxonomy landing");
  return response.json();
}

export async function TaxonomyLanding({ kind, slug }: { kind: "categories" | "tags"; slug: string }) {
  const landing = await getTaxonomyLanding(kind, slug); if (!landing) notFound();
  const label = kind === "categories" ? "Category" : "Tag";
  return <div><PageHero eyebrow={`${label} Teman Belajar`} title={landing.term.name} description={landing.term.description || `Konten terbit yang dikelompokkan dalam ${label.toLowerCase()} ${landing.term.name}.`} /><section className="portal-container py-12 sm:py-16"><nav aria-label="Breadcrumb" className="mb-7 flex gap-2 text-sm text-slate-500"><Link href="/" className="font-bold text-teal-700">Beranda</Link><span aria-hidden="true">/</span><span>{label}</span><span aria-hidden="true">/</span><span aria-current="page">{landing.term.name}</span></nav>{landing.items.length === 0 ? <EmptyState title="Belum ada konten terbit" description="Landing ini tetap noindex sampai memiliki nilai konten yang memadai." /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{landing.items.map((item) => <article key={`${item.content_type}-${item.slug}`} className="portal-card flex min-h-60 flex-col p-6"><span className="portal-badge w-fit">{item.content_type === "knowledge" ? "Pengetahuan" : item.content_type === "announcement" ? "Pengumuman" : "Berita"}</span><h2 className="mt-5 text-xl font-extrabold text-slate-900"><Link href={item.url} className="hover:text-teal-700">{item.title}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary || "Buka konten untuk membaca informasi selengkapnya."}</p><p className="mt-auto pt-5 text-xs font-bold text-slate-500">Diperbarui {formatDate(item.updated_at)}</p></article>)}</div>} {!landing.indexable && <p className="mt-8 rounded-xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">Landing ini tersedia untuk navigasi pengguna, tetapi tidak diindeks sampai memenuhi kebijakan kualitas konten.</p>}</section></div>;
}
