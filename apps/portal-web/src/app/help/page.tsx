import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, ErrorState, PageHero } from "@/components/public-content";
import { getPublicFAQs } from "@/lib/faqs";

function escapeJSONLD(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const query = await searchParams;
  const searching = Boolean(query.q?.trim());
  return {
    title: "FAQ dan Pusat Bantuan",
    description: "Jawaban terkurasi untuk menggunakan Teman Belajar dan memahami layanan pembelajaran.",
    alternates: { canonical: "/help" },
    robots: { index: !searching, follow: true },
  };
}

export default async function HelpCenterPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 100);
  const result = await getPublicFAQs(query);
  const visible = result.data.flatMap((group) => group.items);
  const structuredItems = visible.filter((item) => item.indexable).map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  }));
  const jsonLd = structuredItems.length
    ? escapeJSONLD({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: structuredItems })
    : "";

  return <>
    <PageHero eyebrow="Pusat bantuan" title="Jawaban yang mudah ditemukan" description="Telusuri pertanyaan umum yang telah melewati alur kerja editorial Teman Belajar." />
    <section className="portal-container py-12 sm:py-16">
      <form action="/help" method="GET" role="search" className="portal-card mx-auto flex max-w-3xl flex-col gap-3 p-5 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor="help-search" className="sr-only">Cari pertanyaan FAQ</label>
          <input id="help-search" name="q" type="search" maxLength={100} defaultValue={query} className="portal-search-input w-full" placeholder="Cari akun, pembelajaran, artikel, atau tema…" />
        </div>
        <button className="portal-button-primary">Cari jawaban</button>
        {query && <Link href="/help" className="portal-button-secondary">Reset</Link>}
      </form>
      <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-500" aria-live="polite">
        {query ? `${result.total} jawaban ditemukan untuk “${query}”.` : `${result.total} jawaban terkurasi tersedia.`}
      </p>
      <div className="mt-10">
        {result.error ? <ErrorState title="Pusat bantuan belum dapat dimuat" /> : result.total === 0 ? (
          <EmptyState title={query ? "Jawaban belum ditemukan" : "FAQ belum tersedia"} description={query ? "Coba kata yang lebih singkat atau telusuri seluruh kategori." : "FAQ yang telah diterbitkan akan tampil di halaman ini."} />
        ) : (
          <div className="grid gap-10">
            {result.data.map((group) => <section key={group.category.id} aria-labelledby={`faq-category-${group.category.id}`}>
              <div className="mb-5">
                <p className="portal-eyebrow">Kategori</p>
                <h2 id={`faq-category-${group.category.id}`} className="mt-2 text-2xl font-black text-slate-900">{group.category.name}</h2>
                {group.category.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{group.category.description}</p>}
              </div>
              <div className="grid gap-4">
                {group.items.map((item) => <details id={item.slug} key={item.id} className="portal-faq scroll-mt-28">
                  <summary>{item.question}</summary>
                  <div className="border-t px-5 py-5" style={{ borderColor: "var(--portal-border)" }}>
                    {item.media_asset_id && <Image unoptimized width={1200} height={630} src={`/media/${encodeURIComponent(item.media_asset_id)}`} alt={item.media_alt || ""} className="mb-5 max-h-72 w-full rounded-xl object-cover" />}
                    <p className="!border-0 !p-0 whitespace-pre-line">{item.answer}</p>
                  </div>
                </details>)}
              </div>
            </section>)}
          </div>
        )}
      </div>
    </section>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
  </>;
}
