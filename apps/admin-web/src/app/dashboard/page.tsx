import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { AdminIcon, type AdminIconName } from "@/components/admin-icon";
import { authOptions } from "@/lib/auth";

const modules: Array<{ href: string; title: string; copy: string; icon: AdminIconName; label: string }> = [
  { href: "/dashboard/knowledge", title: "Pusat Pengetahuan", copy: "Kelola artikel, revisi, dan proses review.", icon: "knowledge", label: "Knowledge" },
  { href: "/dashboard/news", title: "Berita", copy: "Susun kabar dan cerita pembelajaran organisasi.", icon: "news", label: "CMS" },
  { href: "/dashboard/announcements", title: "Pengumuman", copy: "Atur informasi aktif dan terjadwal.", icon: "announcement", label: "Jadwal" },
  { href: "/dashboard/media", title: "Media Library", copy: "Kelola gambar dan dokumen yang aman.", icon: "media", label: "Aset" },
];

const workflow = [["1", "Draft", "Editor"], ["2", "Dalam review", "Editor"], ["3", "Disetujui", "Reviewer"], ["4", "Terbit", "Reviewer"], ["5", "Arsip", "Editorial"]];

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard");
  const roles = (session as typeof session & { roles?: string[] }).roles || [];
  const hasAccess = roles.some((role) => ["Portal Administrator", "Content Editor", "Reviewer"].includes(role));
  if (!hasAccess) return <div className="admin-card mx-auto max-w-xl border-rose-200 p-8 text-center" role="alert"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 font-black text-rose-700">403</span><h1 className="mt-5 text-2xl font-black text-slate-900">Akses tidak tersedia</h1><p className="mt-3 text-slate-600">Akun ini belum memiliki role editorial yang diperlukan.</p><Link href="/api/auth/federated-logout" prefetch={false} className="admin-button mt-6">Keluar dan masuk kembali</Link></div>;

  const name = session.user?.name?.split(" ")[0] || "Tim";
  return <div className="admin-page space-y-7">
    <div className="admin-page-header"><div><p className="admin-kicker">Dashboard editorial</p><h1 className="admin-page-title">Selamat datang, {name}</h1><p className="admin-page-copy">Pantau fondasi workflow dan buka modul kerja Anda.</p></div><div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"><span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />Workflow aktif</div></div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="relative min-h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 p-7 text-white shadow-xl shadow-orange-950/10 sm:p-8" aria-labelledby="welcome-title"><div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[36px] border-white/10" aria-hidden="true" /><div className="relative max-w-xl"><p className="text-xs font-black uppercase tracking-[.2em] text-orange-100">Teman Belajar Admin</p><h2 id="welcome-title" className="mt-4 text-3xl font-black sm:text-4xl">Kelola konten dengan alur yang jelas.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-orange-50">Mulai dari draft, review bersama, lalu terbitkan pengalaman belajar yang berkualitas.</p><Link href="/dashboard/knowledge/create" className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-white/40 bg-white/15 px-5 text-sm font-bold text-white transition hover:bg-white/25">Buat artikel baru <AdminIcon name="arrow" className="ml-2 h-4 w-4" /></Link></div></section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">{[["4", "Modul aktif", "dashboard" as const], ["5", "Tahap workflow", "audit" as const], ["3", "Role editorial", "users" as const], ["20 MB", "Batas media", "media" as const]].map(([value, label, icon]) => <div key={label} className="admin-stat-card"><div className="flex items-start justify-between"><span className="admin-stat-icon"><AdminIcon name={icon as AdminIconName} className="h-5 w-5" /></span><span className="text-2xl font-black text-slate-900">{value}</span></div><p className="mt-5 text-sm font-bold text-slate-600">{label}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-orange-500" /></div></div>)}</div>
    </div>

    <section aria-labelledby="modules-title"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Akses cepat</p><h2 id="modules-title" className="mt-1 text-xl font-black text-slate-900">Modul editorial</h2></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{modules.map((module) => <Link key={module.href} href={module.href} className="admin-card group p-5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between"><span className="admin-stat-icon"><AdminIcon name={module.icon} className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{module.label}</span></div><h3 className="mt-6 text-lg font-black text-slate-900">{module.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{module.copy}</p><span className="mt-5 inline-flex items-center text-sm font-bold text-orange-700">Buka modul <AdminIcon name="arrow" className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span></Link>)}</div></section>

    <section className="admin-card overflow-hidden" aria-labelledby="workflow-title"><div className="flex flex-col justify-between gap-3 border-b p-6 sm:flex-row sm:items-center"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Editorial workflow</p><h2 id="workflow-title" className="mt-1 text-lg font-black text-slate-900">Alur publikasi terkontrol</h2></div><span className="text-xs font-semibold text-slate-500">Berlaku untuk seluruh modul konten</span></div><ol className="grid gap-0 p-5 md:grid-cols-5">{workflow.map(([number, status, owner], index) => <li key={status} className="relative border-b border-slate-100 p-4 last:border-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-xs font-black text-orange-700">{number}</span><span className="text-xs font-bold text-slate-400">{owner}</span></div><p className="mt-4 text-sm font-extrabold text-slate-800">{status}</p>{index < workflow.length - 1 && <AdminIcon name="arrow" className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 rounded-full bg-white text-slate-300 md:block" />}</li>)}</ol></section>
  </div>;
}
