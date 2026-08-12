import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function getAnnouncements() {
  const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
  if (!API_BASE) throw new Error("Missing PORTAL_API_INTERNAL_URL");

  const res = await fetch(`${API_BASE}/api/v1/announcements`, {
    next: { revalidate: 60 } 
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  const announcementsRes = await getAnnouncements();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <section className="bg-amber-500 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Pengumuman</h1>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto">
            Informasi penting dan jadwal kegiatan untuk peserta Teman Belajar.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium">
            &larr; Kembali ke Beranda
          </Link>
        </div>

        {!announcementsRes || !announcementsRes.data || announcementsRes.data.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Tidak ada pengumuman aktif</h3>
            <p className="text-gray-500">Saat ini tidak ada informasi penting yang perlu ditampilkan.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcementsRes.data.map((ann: any) => (
              <div key={ann.id} className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{ann.title}</h2>
                    {ann.start_at && ann.end_at && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ml-4">
                        {new Date(ann.start_at).toLocaleDateString()} - {new Date(ann.end_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-slate-700 space-y-4">
                    {ann.body.split('\n').map((paragraph: string, i: number) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
