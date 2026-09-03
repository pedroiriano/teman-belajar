import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, ErrorState, FAQSidebar, FAQAccordionController, FullScreenHero, SearchField } from "@/components/techwind";
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

  const categories = result.data.map((group) => ({
    id: group.category.id,
    name: group.category.name,
  }));

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "FAQ & Pusat Bantuan" },
  ];

  return <>
    <FAQAccordionController />
    <FullScreenHero
      title="FAQ dan Pusat Bantuan"
      description="Telusuri jawaban atas pertanyaan umum seputar akun, program pembelajaran, dan layanan platform Teman Belajar."
      backgroundImage="/techwind-hero/helpcenter.jpg"
      align="center"
      variant="listing"
      breadcrumbs={breadcrumbs}
    >
      <Link href="#faq" className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md">
        Lihat FAQ
      </Link>
    </FullScreenHero>
    <section id="faq" className="portal-container py-12 sm:py-16">
      <form action="/help" method="GET" role="search" className="portal-card mx-auto flex max-w-3xl flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <SearchField
          id="help-search"
          name="q"
          label="Cari pertanyaan FAQ"
          showLabel={false}
          defaultValue={query}
          placeholder="Cari akun, pembelajaran, artikel, atau tema…"
          className="min-w-0 flex-1"
        />
        <div className="flex items-center gap-2">
          <button className="portal-button-primary">Cari jawaban</button>
          {query && <Link href="/help" className="portal-button-secondary">Reset</Link>}
        </div>
      </form>
      <p className="mx-auto mt-4 max-w-3xl text-sm text-center text-slate-500 dark:text-slate-400" aria-live="polite">
        {query ? (
          <span>Menampilkan <strong>{result.total}</strong> jawaban ditemukan untuk <span className="text-primary font-semibold">“{query}”</span>.</span>
        ) : (
          <span>Menampilkan <strong>{result.total}</strong> jawaban terkurasi tersedia.</span>
        )}
      </p>
      <div className="mt-10">
        {result.error ? <ErrorState title="Pusat bantuan belum dapat dimuat" /> : result.total === 0 ? (
          <EmptyState title={query ? "Jawaban belum ditemukan" : "FAQ belum tersedia"} description={query ? "Coba kata yang lebih singkat atau telusuri seluruh kategori." : "FAQ yang telah diterbitkan akan tampil di halaman ini."} />
        ) : (
          <div>
            {categories.length > 1 && (
              <div className="mb-8 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Kategori FAQ</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`#faq-category-${cat.id}`}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary whitespace-nowrap shadow-sm"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-12">
              <FAQSidebar categories={categories} />
              <div className="grid gap-10">
                {result.data.map((group) => <section key={group.category.id} aria-labelledby={`faq-category-${group.category.id}`}>
                  <div className="mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <p className="portal-eyebrow">Kategori</p>
                    <h2 id={`faq-category-${group.category.id}`} className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{group.category.name}</h2>
                    {group.category.description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{group.category.description}</p>}
                  </div>
                  <div className="grid gap-4">
                    {group.items.map((item) => <details id={item.slug} key={item.id} name="help-faq" className="portal-faq scroll-mt-28 shadow-sm dark:shadow-gray-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300">
                      <summary className="cursor-pointer font-bold text-slate-900 dark:text-white hover:text-primary transition-colors">{item.question}</summary>
                      <div className="border-t px-5 py-5 border-slate-100 dark:border-slate-800">
                        {item.media_asset_id && <Image unoptimized width={1200} height={630} src={`/media/${encodeURIComponent(item.media_asset_id)}`} alt={item.media_alt || ""} className="mb-5 max-h-72 w-full rounded-xl object-cover" />}
                        <p className="!border-0 !p-0 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.answer}</p>
                      </div>
                    </details>)}
                  </div>
                </section>)}
              </div>
            </div>

            <div className="mt-20 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-8 sm:p-12 text-center">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Belum menemukan jawaban yang Anda cari?</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
                Temukan panduan lengkap di Pusat Pengetahuan atau lakukan pencarian materi secara menyeluruh di seluruh platform.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/knowledge"
                  className="py-2.5 px-6 inline-block font-semibold border border-primary bg-primary hover:bg-primary-700 hover:border-primary-700 text-white rounded-md transition-colors text-sm shadow-sm"
                >
                  Buka Pusat Pengetahuan
                </Link>
                <Link
                  href="/search"
                  className="py-2.5 px-6 inline-block font-semibold border border-slate-300 dark:border-slate-600 hover:border-primary text-slate-700 dark:text-slate-300 hover:text-primary rounded-md transition-colors text-sm bg-white dark:bg-slate-900"
                >
                  Pencarian Terpadu
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
  </>;
}
