import { EmptyState, ErrorState, formatDate, PageHero } from "@/components/public-content";
import Link from "next/link";

type Announcement = { id: string; slug: string; title: string; body: string; start_at?: string; end_at?: string };

async function getAnnouncements() {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) return { data: [], error: true };

  const res = await fetch(`${API_BASE}/api/v1/announcements`, {
    next: { revalidate: 60 } 
  });
  if (!res.ok) {
    return { data: [], error: true };
  }
  const payload = await res.json();
  return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
}

export default async function AnnouncementsPage() {
  const announcementsRes = await getAnnouncements();

  return (
    <div>
      <PageHero eyebrow="Informasi Terkini" title="Pengumuman penting untuk Anda" description="Pantau informasi operasional, jadwal, dan pembaruan penting dari Teman Belajar." />

      <section className="portal-container max-w-5xl py-12 sm:py-16">
        {announcementsRes.error ? <ErrorState title="Pengumuman belum dapat dimuat" /> : announcementsRes.data.length === 0 ? (
          <EmptyState title="Tidak ada pengumuman aktif" description="Saat ini tidak ada informasi penting yang perlu ditampilkan." />
        ) : (
          <div className="space-y-5">
            {announcementsRes.data.map((ann: Announcement) => (
              <article key={ann.id} className="portal-card overflow-hidden border-l-4 border-l-sky-500">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Pengumuman aktif</p><h2 className="mt-2 text-2xl font-extrabold text-slate-900"><Link href={`/announcements/${ann.slug}`} className="hover:text-teal-700">{ann.title}</Link></h2></div>
                    {ann.start_at && ann.end_at && (
                      <span className="whitespace-nowrap rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-900">
                        {formatDate(ann.start_at)} — {formatDate(ann.end_at)}
                      </span>
                    )}
                  </div>
                  <Link href={`/announcements/${ann.slug}`} className="mt-5 inline-flex text-sm font-extrabold text-teal-700">Baca pengumuman <span aria-hidden="true">→</span></Link>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                    {ann.body.split('\n').map((paragraph: string, i: number) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
