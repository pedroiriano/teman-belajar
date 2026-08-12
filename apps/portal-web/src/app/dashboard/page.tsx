import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const firstName = session.user?.name?.split(" ")[0] || "Pembelajar";
  return <div className="portal-container py-10 sm:py-14"><div className="rounded-3xl bg-[#102a43] p-7 text-white shadow-xl sm:p-10"><p className="text-sm font-bold text-teal-300">Selamat datang kembali</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Halo, {firstName}!</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Lanjutkan perjalanan belajar Anda atau temukan pengetahuan baru yang relevan untuk pekerjaan hari ini.</p></div><section aria-labelledby="quick-access" className="mt-10"><div className="flex items-end justify-between"><div><p className="portal-eyebrow">Akses cepat</p><h2 id="quick-access" className="mt-2 text-2xl font-black">Mulai dari sini</h2></div></div><div className="mt-6 grid gap-5 md:grid-cols-3">{[["/knowledge","Pusat Pengetahuan","Temukan panduan dan praktik terbaik yang terkurasi."],["/news","Berita terbaru","Ikuti perkembangan program pembelajaran."],["/announcements","Pengumuman","Lihat informasi dan jadwal penting yang aktif."]].map(([href,title,copy]) => <Link key={href} href={href} className="portal-card group p-6 transition hover:-translate-y-1"><span className="text-xs font-black uppercase tracking-wider text-teal-700">Teman Belajar</span><h3 className="mt-3 text-lg font-extrabold group-hover:text-teal-700">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p><span className="mt-5 inline-block text-sm font-bold text-teal-700">Buka <span aria-hidden="true">→</span></span></Link>)}</div></section><section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-extrabold text-slate-800">Aktivitas belajar akan hadir di tahap berikutnya</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Integrasi dashboard pembelajaran Moodle dijadwalkan pada TASK-006. Fondasi autentikasi Anda sudah siap.</p></section></div>;
}
