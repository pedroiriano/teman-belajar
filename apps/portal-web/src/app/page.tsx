import Link from "next/link";

import { PortalIcon, type PortalIconName } from "@/components/portal-icon";
import { getPublicFAQs } from "@/lib/faqs";

type Highlight = { href: string; label: string; title: string; copy: string; icon: PortalIconName; tone: string };

const highlights: Highlight[] = [
  { href: "/knowledge", label: "Pusat Pengetahuan", title: "Jawaban tepercaya saat dibutuhkan", copy: "Panduan dan praktik terbaik melalui alur kerja peninjauan editorial.", icon: "book", tone: "bg-teal-50 text-teal-800" },
  { href: "/news", label: "Berita", title: "Perkembangan organisasi dalam satu ruang", copy: "Ikuti program, inisiatif, dan cerita pembelajaran terbaru.", icon: "news", tone: "bg-sky-50 text-sky-800" },
  { href: "/announcements", label: "Pengumuman", title: "Informasi penting tanpa terlewat", copy: "Pantau informasi aktif dan jadwal yang relevan untuk pekerjaan Anda.", icon: "calendar", tone: "bg-amber-50 text-amber-800" },
];

const learningPaths = [
  { title: "Kelas dan program", copy: "Akses pembelajaran formal yang dikelola melalui Moodle.", icon: "graduation" as const, href: "/my-learning", label: "Buka pembelajaran" },
  { title: "Pengetahuan saat dibutuhkan", copy: "Cari pengetahuan terkurasi untuk mendukung pekerjaan sehari-hari.", icon: "book" as const, href: "/knowledge", label: "Telusuri artikel" },
  { title: "Pencarian terpadu", copy: "Temukan kelas, artikel, berita, dan pengumuman dari satu pencarian.", icon: "search" as const, href: "/search", label: "Mulai mencari" },
];

const categories = [
  { title: "Kepemimpinan", query: "kepemimpinan", icon: "users" as const },
  { title: "Keterampilan digital", query: "digital", icon: "grid" as const },
  { title: "Kolaborasi", query: "kolaborasi", icon: "message" as const },
  { title: "Profesional", query: "profesional", icon: "briefcase" as const },
];

export default async function Home() {
  const faqResult = await getPublicFAQs();
  const faqs = faqResult.data.flatMap((group) => group.items).slice(0, 4);
  return (
    <>
      <section className="portal-course-hero" data-techwind-pattern="index-course-hero">
        <div className="portal-course-hero-shape portal-course-hero-shape-one" aria-hidden="true" />
        <div className="portal-course-hero-shape portal-course-hero-shape-two" aria-hidden="true" />
        <div className="portal-container relative grid min-h-[650px] items-center gap-14 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <div className="portal-course-hero-label"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Belajar. Berbagi. Bertumbuh.</div>
            <h1 className="portal-course-hero-title">Belajar bersama <span>ahlinya</span>, kapan pun dan di mana pun.</h1>
            <p className="portal-course-hero-copy">Temukan pembelajaran formal, pengetahuan organisasi, dan informasi penting melalui pengalaman yang sederhana, aman, dan terhubung.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/search" className="portal-button-primary">Jelajahi Teman Belajar <span className="ml-2" aria-hidden="true">→</span></Link><Link href="/api/auth/signin?callbackUrl=/" className="portal-button-secondary">Masuk ke akun</Link></div>
            <div className="portal-course-hero-trust"><span><PortalIcon name="shield" className="h-4 w-4" />SSO terpusat</span><span><PortalIcon name="book" className="h-4 w-4" />Konten terkurasi</span><span><PortalIcon name="compass" className="h-4 w-4" />Responsif</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-lg" aria-label="Pratinjau pengalaman Teman Belajar">
            <div className="absolute -inset-8 rounded-full bg-teal-400/10 blur-3xl" aria-hidden="true" />
            <div className="portal-course-hero-preview">
              <div className="portal-course-hero-screen">
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Untuk Anda</p><h2 className="mt-1 text-xl font-extrabold">Lanjutkan perjalananmu</h2></div><span className="portal-icon-tile !rounded-full"><PortalIcon name="sparkles" className="h-5 w-5" /></span></div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><PortalIcon name="graduation" className="h-6 w-6" /></span><div><p className="text-xs font-bold text-teal-700">PEMBELAJARAN TERHUBUNG</p><h3 className="mt-1 font-bold">Kelas formal dan pengetahuan dalam satu perjalanan</h3><p className="mt-2 text-sm text-slate-500">Moodle + Teman Belajar</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-2/3 rounded-full bg-teal-600" /></div><p className="mt-2 text-right text-xs font-bold text-slate-500">Pengalaman terpadu</p></div>
                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-100 p-4"><PortalIcon name="book" className="h-5 w-5 text-teal-700" /><p className="mt-3 text-sm font-bold">Pengetahuan</p><p className="mt-1 text-xs text-slate-500">Terkurasi</p></div><div className="rounded-xl border border-slate-100 p-4"><PortalIcon name="shield" className="h-5 w-5 text-amber-600" /><p className="mt-3 text-sm font-bold">Identitas</p><p className="mt-1 text-xs text-slate-500">Terpusat</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-6">
        <div className="portal-container grid gap-4 text-center sm:grid-cols-3"><p className="text-sm font-bold text-slate-700">Moodle untuk pembelajaran formal</p><p className="text-sm font-bold text-slate-700">Keycloak untuk identitas terpusat</p><p className="text-sm font-bold text-slate-700">Teman Belajar untuk pengalaman</p></div>
      </section>

      <section className="portal-section">
        <div className="portal-container">
          <div className="portal-section-heading"><p className="portal-eyebrow">Mulai dari kebutuhan Anda</p><h2 className="portal-section-title">Tiga jalur, satu pengalaman belajar</h2><p className="portal-section-copy">Pilih pembelajaran formal, cari jawaban cepat, atau telusuri seluruh sumber dari satu tempat.</p></div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">{learningPaths.map((item) => <article key={item.title} className="portal-card portal-course-card group p-7 transition hover:-translate-y-1"><span className="portal-icon-tile"><PortalIcon name={item.icon} className="h-6 w-6" /></span><h3 className="mt-6 text-xl font-extrabold text-slate-900">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p><Link href={item.href} className="mt-6 inline-flex items-center text-sm font-bold text-teal-700">{item.label}<span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">→</span></Link></article>)}</div>
        </div>
      </section>

      <section className="portal-section portal-section-muted">
        <div className="portal-container">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="portal-eyebrow">Topik pembelajaran</p><h2 className="portal-section-title">Temukan dari kategori yang relevan</h2><p className="portal-section-copy">Mulai dengan topik, kemudian sempitkan hasil pada kelas atau pengetahuan.</p></div><Link href="/search" className="portal-button-secondary">Lihat semua hasil</Link></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category) => <Link key={category.title} href={`/search?q=${category.query}`} className="portal-card group flex items-center gap-4 p-5 transition hover:-translate-y-1"><span className="portal-icon-tile"><PortalIcon name={category.icon} className="h-6 w-6" /></span><span className="font-extrabold text-slate-900">{category.title}</span><span className="ml-auto text-teal-700 transition group-hover:translate-x-1">→</span></Link>)}</div>
        </div>
      </section>

      <section className="portal-section">
        <div className="portal-container">
          <div className="portal-section-heading"><p className="portal-eyebrow">Konten organisasi</p><h2 className="portal-section-title">Pengetahuan yang bergerak bersama Anda</h2><p className="portal-section-copy">Informasi harian dan panduan mendalam dirancang agar mudah ditemukan dan nyaman dibaca.</p></div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">{highlights.map((feature) => <article key={feature.href} className="portal-card portal-course-card group flex min-h-72 flex-col p-7"><span className={`grid h-12 w-12 place-items-center rounded-xl ${feature.tone}`}><PortalIcon name={feature.icon} className="h-6 w-6" /></span><p className="mt-6 text-xs font-black uppercase tracking-[.16em] text-slate-400">{feature.label}</p><h3 className="mt-3 text-xl font-extrabold leading-7 text-slate-900">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{feature.copy}</p><Link href={feature.href} className="mt-auto pt-6 text-sm font-bold text-teal-700">Jelajahi sekarang <span aria-hidden="true">→</span></Link></article>)}</div>
        </div>
      </section>

      <section id="media" className="portal-section overflow-hidden bg-[#102a43] text-white">
        <div className="portal-container grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-teal-300">Media pembelajaran</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Visual yang hidup di dalam konten tepercaya.</h2><p className="mt-5 text-base leading-8 text-slate-300">Gambar dan dokumen dikelola melalui Pustaka Media, lalu hanya tersedia secara publik ketika terhubung ke konten yang telah diterbitkan.</p><Link href="/knowledge" className="portal-button-primary mt-8 !bg-teal-500 !text-slate-950">Lihat konten bermedia</Link></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Galeri kapabilitas media"><div className="portal-gallery-tile col-span-2 row-span-2 min-h-72 sm:col-span-2"><PortalIcon name="gallery" className="h-12 w-12" /><p className="mt-5 text-xl font-black">Galeri terkurasi</p><p className="mt-2 text-sm text-slate-300">Terhubung ke artikel, berita, dan pengumuman.</p></div><div className="portal-gallery-tile min-h-32"><PortalIcon name="play" className="h-8 w-8" /><p className="mt-3 font-bold">Media visual</p></div><div className="portal-gallery-tile min-h-32"><PortalIcon name="shield" className="h-8 w-8" /><p className="mt-3 font-bold">Akses aman</p></div></div>
        </div>
      </section>

      <section className="portal-section portal-section-muted">
        <div className="portal-container"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[["1", "Identitas terpusat"], ["2", "Pengalaman terpisah"], ["5", "Tahap editorial"], ["24/7", "Akses pengetahuan"]].map(([value, label]) => <div key={label} className="portal-card p-6 text-center"><p className="text-3xl font-black text-teal-700">{value}</p><p className="mt-2 text-sm font-bold text-slate-600">{label}</p></div>)}</div></div>
      </section>

      <section id="faq" className="portal-section">
        <div className="portal-container grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="portal-eyebrow">Pertanyaan umum</p><h2 className="portal-section-title">Kenali cara kerja Teman Belajar</h2><p className="portal-section-copy">Jawaban terkurasi untuk membantu Anda mulai menggunakan platform.</p><Link href="/help" className="portal-button-secondary mt-6">Buka Pusat Bantuan</Link></div><div className="grid gap-4">{faqs.length?faqs.map((item) => <details key={item.id} className="portal-faq"><summary>{item.question}</summary><p>{item.answer}</p></details>):<div className="portal-card p-6 text-sm text-slate-500">FAQ terbit akan tampil di sini. Buka Pusat Bantuan untuk mencoba kembali.</div>}</div></div>
      </section>

      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="portal-container"><div className="relative overflow-hidden rounded-[2rem] bg-teal-700 px-6 py-12 text-center text-white shadow-2xl sm:px-12"><div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_20%,#fbbf24_0,transparent_24%),radial-gradient(circle_at_90%_80%,#38bdf8_0,transparent_30%)]" aria-hidden="true" /><div className="relative mx-auto max-w-3xl"><PortalIcon name="sparkles" className="mx-auto h-9 w-9 text-teal-200" /><h2 className="mt-5 text-3xl font-black sm:text-4xl">Siap melanjutkan perjalanan belajar?</h2><p className="mt-4 text-base leading-8 text-teal-50">Masuk dengan akun organisasi untuk membuka pembelajaran formal dan pengalaman personal Anda.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/api/auth/signin?callbackUrl=/" className="portal-button-secondary !border-white !bg-white !text-teal-800">Masuk ke akun</Link><Link href="/knowledge" className="portal-button-secondary !border-white/30 !bg-white/10 !text-white">Jelajahi pengetahuan</Link></div></div></div></div>
      </section>
    </>
  );
}

