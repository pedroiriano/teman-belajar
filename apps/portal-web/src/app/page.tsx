import Link from "next/link";

const features = [
  { href: "/knowledge", label: "Pusat Pengetahuan", title: "Jawaban tepercaya, saat Anda membutuhkannya", copy: "Temukan panduan dan praktik terbaik yang telah melalui proses review editorial.", tone: "bg-teal-50 text-teal-800", icon: "M12 3v18M5 7h10.5A3.5 3.5 0 0 1 19 10.5V17H8.5A3.5 3.5 0 0 0 5 20.5V7Z" },
  { href: "/news", label: "Berita", title: "Tetap dekat dengan perkembangan terbaru", copy: "Ikuti kabar, program, dan cerita pembelajaran dari seluruh organisasi.", tone: "bg-sky-50 text-sky-800", icon: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" },
  { href: "/announcements", label: "Pengumuman", title: "Informasi penting tanpa terlewat", copy: "Lihat pengumuman aktif dan jadwal penting dalam satu tempat yang ringkas.", tone: "bg-amber-50 text-amber-800", icon: "M5 13V9l12-5v14L5 13Zm0 0 2 7h4l-2-6" },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#102a43] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,#14b8a6_0,transparent_30%),radial-gradient(circle_at_80%_70%,#f59e0b_0,transparent_24%)]" aria-hidden="true" />
        <div className="portal-container relative grid min-h-[650px] items-center gap-12 py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-100"><span className="h-2 w-2 rounded-full bg-amber-400" /> Belajar. Berbagi. Bertumbuh.</div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Satu ruang untuk perjalanan belajar yang <span className="text-teal-300">lebih bermakna.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">Teman Belajar menyatukan pengetahuan organisasi, pembelajaran formal, dan informasi penting agar setiap orang dapat berkembang dengan percaya diri.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/knowledge" className="portal-button-primary !bg-teal-500 !text-slate-950 hover:!bg-teal-400">Jelajahi pengetahuan <span className="ml-2" aria-hidden="true">→</span></Link><Link href="/api/auth/signin" className="portal-button-secondary !border-white/20 !bg-white/10 !text-white hover:!border-white/50 hover:!bg-white/15">Masuk ke akun</Link></div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300"><span className="flex items-center gap-2"><b className="text-teal-300">✓</b> SSO yang aman</span><span className="flex items-center gap-2"><b className="text-teal-300">✓</b> Konten terkurasi</span><span className="flex items-center gap-2"><b className="text-teal-300">✓</b> Siap di semua perangkat</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-lg" aria-label="Gambaran pengalaman belajar Teman Belajar">
            <div className="absolute -inset-8 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="relative rotate-1 rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
              <div className="rounded-[1.4rem] bg-white p-5 text-slate-900 shadow-xl sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Untuk Anda</p><h2 className="mt-1 text-xl font-extrabold">Lanjutkan perjalananmu</h2></div><span className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700">★</span></div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-700 text-lg font-black text-white">TB</span><div><p className="text-xs font-bold text-teal-700">REKOMENDASI</p><h3 className="mt-1 font-bold">Membangun budaya belajar berkelanjutan</h3><p className="mt-2 text-sm text-slate-500">6 modul • 45 menit</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-2/3 rounded-full bg-teal-600" /></div><p className="mt-2 text-right text-xs font-bold text-slate-500">67% selesai</p></div>
                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 p-4"><p className="text-2xl font-black text-slate-900">12</p><p className="text-xs text-slate-500">Artikel tersimpan</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-2xl font-black text-slate-900">4</p><p className="text-xs text-slate-500">Kursus aktif</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-container py-20 sm:py-24">
        <div className="max-w-2xl"><p className="portal-eyebrow">Semua yang Anda perlukan</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Pengetahuan yang bergerak bersama Anda</h2><p className="mt-4 text-base leading-7 text-slate-600">Mulai dari informasi harian hingga panduan mendalam, semuanya dirancang agar mudah ditemukan dan nyaman dibaca.</p></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">{features.map((feature) => <article key={feature.href} className="portal-card group p-7 transition hover:-translate-y-1 hover:shadow-xl"><span className={`grid h-12 w-12 place-items-center rounded-xl ${feature.tone}`}><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={feature.icon}/></svg></span><p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{feature.label}</p><h3 className="mt-2 text-xl font-extrabold leading-7 text-slate-900">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{feature.copy}</p><Link href={feature.href} className="mt-6 inline-flex items-center text-sm font-bold text-teal-700 group-hover:text-teal-900">Jelajahi sekarang <span className="ml-2 transition group-hover:translate-x-1" aria-hidden="true">→</span></Link></article>)}</div>
      </section>

      <section className="border-y border-slate-200 bg-white"><div className="portal-container grid gap-10 py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="portal-eyebrow">Dibangun untuk organisasi</p><h2 className="mt-3 text-3xl font-black text-slate-900">Pengalaman sederhana, fondasi enterprise.</h2></div><div className="grid gap-5 sm:grid-cols-3">{[["01","Temukan","Konten mudah dicari dan dipahami."],["02","Pelajari","Belajar formal terhubung melalui Moodle."],["03","Terapkan","Wawasan berubah menjadi praktik nyata."]].map(([n,t,c]) => <div key={n} className="border-l-2 border-teal-600 pl-5"><span className="text-xs font-black text-teal-700">{n}</span><h3 className="mt-2 font-extrabold">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{c}</p></div>)}</div></div></section>
    </>
  );
}
