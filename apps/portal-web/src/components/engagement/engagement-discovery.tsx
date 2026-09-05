"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PortalIcon } from "@/components/portal-icon";
import type { EngagementItem, EngagementList, Recommendation, RecommendationList } from "@/lib/engagement/types";

const reasonLabels: Record<Recommendation["reason"], string> = {
  same_category: "Topik serupa dengan konten tersimpan",
  recent_interest: "Selaras dengan konten yang baru dilihat",
  popular_rating: "Selaras dengan artikel yang Anda nilai tinggi",
  fallback_recent: "Konten publik terbaru",
  editorial_pin: "Pilihan Kurasi Editorial",
};

function ContentCard({ item, reason }: { item: EngagementItem; reason?: string }) {
  const isEditorial = reason === reasonLabels.editorial_pin;
  return (
    <article className="portal-card flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="portal-badge">
          {item.target_type === "microlearning" ? "Pembelajaran Singkat" : "Pusat Pengetahuan"}
        </span>
        {isEditorial && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <PortalIcon name="sparkles" className="h-3.5 w-3.5 text-teal-600" />
            Pilihan Editor
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-black leading-6 text-slate-900 dark:text-white"><Link href={item.url} className="hover:text-teal-700 dark:hover:text-teal-400">{item.title}</Link></h3>
      {item.summary && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.summary}</p>}
      {reason && <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400"><PortalIcon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0" />{reason}</p>}
      <Link href={item.url} className="mt-auto pt-5 text-sm font-bold text-teal-700 hover:underline dark:text-teal-400">Pelajari sekarang →</Link>
    </article>
  );
}

function Section({ eyebrow, title, items, reasons }: { eyebrow: string; title: string; items: EngagementItem[]; reasons?: Map<string, string> }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby={`engagement-${eyebrow.replaceAll(" ", "-").toLowerCase()}`}>
      <p className="portal-eyebrow">{eyebrow}</p>
      <h2 id={`engagement-${eyebrow.replaceAll(" ", "-").toLowerCase()}`} className="mt-2 text-2xl font-black text-slate-900">{title}</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ContentCard key={`${item.target_type}-${item.target_id}`} item={item} reason={reasons?.get(item.target_id)} />)}</div>
    </section>
  );
}

export function EngagementDiscovery() {
  const [bookmarks, setBookmarks] = useState<EngagementItem[]>([]);
  const [recent, setRecent] = useState<EngagementItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      fetch("/api/engagement/bookmarks", { cache: "no-store", signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<EngagementList>; }).then((payload) => setBookmarks(payload.data.slice(0, 6))),
      fetch("/api/engagement/recent-views", { cache: "no-store", signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<EngagementList>; }).then((payload) => setRecent(payload.data.slice(0, 6))),
      fetch("/api/engagement/recommendations", { cache: "no-store", signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<RecommendationList>; }).then((payload) => { setRecommendations(payload.data); setPersonalized(payload.personalized); }),
    ]).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <section className="mt-14" aria-label="Memuat pengalaman personal"><div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-200" />)}</div></section>;
  const reasonMap = new Map(recommendations.map((item) => [item.target_id, reasonLabels[item.reason]]));
  return (
    <>
      <Section eyebrow="Koleksi Anda" title="Konten Tersimpan" items={bookmarks} />
      <Section eyebrow="Aktivitas terbaru" title="Terakhir Dilihat" items={recent} />
      <Section eyebrow="Temukan berikutnya" title={personalized ? "Rekomendasi untuk Anda" : "Mungkin Menarik untuk Anda"} items={recommendations} reasons={reasonMap} />
    </>
  );
}
