import type { Metadata } from "next";
import { EditorialCard, EditorialDetailHero, EmptyState, ErrorState, formatDate } from "@/components/techwind";

type Announcement = { id: string; slug: string; title: string; body: string; start_at?: string; end_at?: string };

async function getAnnouncements() {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return { data: [], error: true };

  try {
    const res = await fetch(`${API_BASE}/api/v1/announcements`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

export const metadata: Metadata = { title: "Pengumuman", description: "Informasi dan pemberitahuan resmi terbaru dari Teman Belajar.", alternates: { canonical: "/announcements" } };

export default async function AnnouncementsPage() {
  const announcementsRes = await getAnnouncements();

  return (
    <div>
      <EditorialDetailHero eyebrow="Pengumuman" title="Pengumuman" summary="Informasi dan pemberitahuan resmi terbaru untuk Anda." breadcrumbs={[{ href: "/", label: "Beranda" }, { label: "Pengumuman" }]} visual="announcement" />

      <section className="portal-container max-w-5xl py-12 sm:py-16">
        {announcementsRes.error ? <ErrorState title="Pengumuman belum dapat dimuat" /> : announcementsRes.data.length === 0 ? (
          <EmptyState title="Tidak ada pengumuman aktif" description="Saat ini tidak ada informasi penting yang perlu ditampilkan." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {announcementsRes.data.map((ann: Announcement) => (
              <EditorialCard key={ann.id} href={`/announcements/${ann.slug}`} title={ann.title} summary={ann.body.replace(/\s+/g, " ").slice(0, 180)} label="Pengumuman aktif" dateLabel={ann.start_at ? `${formatDate(ann.start_at)}${ann.end_at ? ` — ${formatDate(ann.end_at)}` : ""}` : undefined} actionLabel="Lihat pengumuman" icon="bell" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
