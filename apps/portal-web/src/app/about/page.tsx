import type { Metadata } from "next";
import Link from "next/link";
import { FullScreenHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Mengenal Teman Belajar — Platform Pengalaman Belajar Digital Perusahaan (LXP + Moodle LMS) untuk akselerasi kompetensi organisasi.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Tentang Kami" },
  ];

  const pillars = [
    {
      title: "Discovery dan Editorial LXP Modern",
      desc: "Menyediakan katalog kursus intuitif, modul pembelajaran singkat (microlearning), kurasi pengetahuan, dan berita organisasi dalam satu portal terpadu.",
      icon: "sparkles",
    },
    {
      title: "Manajemen Pembelajaran Formal Moodle",
      desc: "Menangani penilaian terstruktur, penugasan, pelacakan kompetensi, dan penerbitan sertifikat resmi yang terpercaya secara internasional.",
      icon: "graduation",
    },
    {
      title: "Identitas Terpusat dan Keamanan Tinggi",
      desc: "Autentikasi tunggal (SSO) terpadu berbasis Keycloak OpenID Connect, proteksi data berbasis peran (RBAC), dan arsitektur tanpa celah keamanan.",
      icon: "check",
    },
    {
      title: "Analitik dan Jalur Belajar Berkelanjutan",
      desc: "Visualisasi metrik capaian pembelajar, rekomendasi cerdas, dan tahapan belajar berjenjang untuk memastikan pertumbuhan profesional pegawai.",
      icon: "dashboard",
    },
  ];

  return (
    <>
      <FullScreenHero
        title="Tentang Teman Belajar"
        description="Mewujudkan ekosistem pembelajaran digital cerdas, inklusif, dan berintegritas tinggi untuk mendorong pertumbuhan kompetensi dan inovasi organisasi."
        backgroundImage="/techwind-hero/team.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      />

      {/* Mission & Vision Section */}
      <section className="portal-container py-14 sm:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="portal-eyebrow">Visi & Misi</span>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Akselerasi Kapabilitas untuk Menjawab Tantangan Masa Depan
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Teman Belajar hadir sebagai jembatan transformasi digital dalam pengembangan sumber daya manusia.
            Kami memadukan kemudahan eksplorasi materi mandiri dengan ketatnya standar kualitas pembelajaran formal enterprise.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {pillars.map((pillar, idx) => (
            <div
              key={pillar.title}
              className="portal-card p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex items-start gap-5 hover:shadow-md transition-shadow"
            >
              <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-primary flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900/50">
                <PortalIcon name={pillar.icon as any} className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Pilar 0{idx + 1}
                </span>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture & Trust Banner */}
      <section className="bg-slate-50 dark:bg-slate-800/40 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="portal-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="portal-eyebrow">Fondasi Terpercaya</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Sinergi Sempurna Antara Portal Modern dan LMS Global
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Di balik pengalaman pengguna yang mulus, Teman Belajar dibangun di atas arsitektur modular yang tangguh:
                backend performa tinggi berbasis Go, antarmuka responsif modern berkecepatan tinggi,
                dan mesin pembelajaran global Moodle yang terisolasi aman melalui kontrak API terverifikasi.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/catalog"
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  Jelajahi Katalog Pembelajaran
                </Link>
                <Link
                  href="/knowledge"
                  className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-sm hover:border-primary hover:text-primary transition-all"
                >
                  Pusat Pengetahuan
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="portal-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                <strong className="block text-3xl font-black text-primary">100%</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Resmi & Terverifikasi
                </span>
              </div>
              <div className="portal-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                <strong className="block text-3xl font-black text-emerald-600 dark:text-emerald-400">24/7</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Akses Fleksibel
                </span>
              </div>
              <div className="portal-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                <strong className="block text-3xl font-black text-teal-600 dark:text-teal-400">SSO</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Satu Akun Terpusat
                </span>
              </div>
              <div className="portal-card p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                <strong className="block text-3xl font-black text-sky-600 dark:text-sky-400">Digital</strong>
                <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Sertifikasi Sah
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
