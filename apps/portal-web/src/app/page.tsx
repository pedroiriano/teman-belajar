import Link from "next/link";

/* eslint-disable @next/next/no-img-element -- licensed Techwind assets and validated Media endpoints */

import {
  formatDate,
  HomepageSearchSection,
  TechwindCourseCard,
  TechwindFaqSection,
  TechwindHeroSlider,
  TechwindHorizontalNewsCard,
  TechwindPortfolioCard,
  type HomepageSearchItem,
  type TechwindHeroSlide,
} from "@/components/techwind";
import { getPublicFAQs } from "@/lib/faqs";
import { listLearningPaths } from "@/lib/learning-paths";
import { listMediaCollections } from "@/lib/media-gallery";
import { listMicrolearning } from "@/lib/microlearning";
import { getPublicPlatformConfiguration, publicMediaPath } from "@/lib/platform-configuration";
import { getCuratedRecommendations } from "@/lib/recommendations";
import { listTrainingPrograms } from "@/lib/training-programs";

type News = { id: string; slug: string; title: string; excerpt?: string; published_at?: string };
type Announcement = { id: string; slug: string; title: string; body: string; start_at?: string; end_at?: string };

async function getNews(page: number = 1, limit: number = 4): Promise<{ data: News[]; error?: true }> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { data: [], error: true };
  try {
    const res = await fetch(`${apiBase}/api/v1/news?page=${page}&page_size=${limit}`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

async function getAnnouncements(limit: number = 8): Promise<{ data: Announcement[]; error?: true }> {
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return { data: [], error: true };
  try {
    const res = await fetch(`${apiBase}/api/v1/announcements?page_size=${limit}`, { next: { revalidate: 60 } });
    if (!res.ok) return { data: [], error: true };
    const payload = await res.json();
    return { ...payload, data: Array.isArray(payload.data) ? payload.data : [] };
  } catch { return { data: [], error: true }; }
}

const heroSlides: TechwindHeroSlide[] = [
  {
    image: "/techwind/hero/bg01.jpg",
    title: "Bangun Kompetensi untuk Masa Depan",
    description: "Temukan pembelajaran terarah untuk mengembangkan keahlian, memperluas wawasan, dan mencapai tujuan profesional Anda.",
    ctaLabel: "Jelajahi Katalog",
    ctaHref: "/catalog",
    align: "left",
  },
  {
    image: "/techwind/hero/bg02.jpg",
    title: "Belajar Singkat, Berdampak Nyata",
    description: "Akses materi singkat, webinar, dan kelas praktis yang dapat diterapkan langsung dalam pekerjaan sehari-hari.",
    ctaLabel: "Lihat Pembelajaran Singkat",
    ctaHref: "/microlearning",
    align: "center",
  },
  {
    image: "/techwind/hero/bg03.jpg",
    title: "Susun Jalur Belajar Anda",
    description: "Ikuti rangkaian pembelajaran bertahap untuk membangun kompetensi yang relevan dengan peran dan tujuan karier.",
    ctaLabel: "Jelajahi Jalur Belajar",
    ctaHref: "/learning-paths",
    align: "right",
  },
];

const fallbackCourses = [
  {
    id: "fb-1",
    href: "/training-programs",
    image: "/techwind-hero/course/c1.jpg",
    category: "Pemasaran Digital",
    title: "Dasar Optimasi Mesin Pencari",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Raka Pratama",
    instructorAvatar: "/techwind-hero/client/01.jpg",
    materialCount: 12,
    duration: "6 jam",
    views: "3012",
    badge: "Gratis",
  },
  {
    id: "fb-2",
    href: "/training-programs",
    image: "/techwind-hero/course/c2.jpg",
    category: "Pemrograman",
    title: "Pengembangan Web Modern dengan JavaScript",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Dewi Lestari",
    instructorAvatar: "/techwind-hero/client/02.jpg",
    materialCount: 18,
    duration: "10 jam",
    views: "2450",
    badge: "Gratis",
  },
  {
    id: "fb-3",
    href: "/training-programs",
    image: "/techwind-hero/course/c3.jpg",
    category: "Analisis Data",
    title: "Analisis Data untuk Pengambilan Keputusan",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Budi Santoso",
    instructorAvatar: "/techwind-hero/client/03.jpg",
    materialCount: 15,
    duration: "8 jam",
    views: "1890",
    badge: "Gratis",
  },
  {
    id: "fb-4",
    href: "/training-programs",
    image: "/techwind-hero/course/c4.jpg",
    category: "Keamanan Siber",
    title: "Dasar Keamanan Siber untuk Organisasi",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Siti Rahma",
    instructorAvatar: "/techwind-hero/client/04.jpg",
    materialCount: 10,
    duration: "5 jam",
    views: "3120",
    badge: "Gratis",
  },
  {
    id: "fb-5",
    href: "/training-programs",
    image: "/techwind-hero/course/c5.jpg",
    category: "Kepemimpinan",
    title: "Kepemimpinan Strategis di Era Digital",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Agus Wijaya",
    instructorAvatar: "/techwind-hero/client/05.jpg",
    materialCount: 14,
    duration: "7 jam",
    views: "2780",
    badge: "Gratis",
  },
  {
    id: "fb-6",
    href: "/training-programs",
    image: "/techwind-hero/course/c6.jpg",
    category: "Kolaborasi",
    title: "Komunikasi Efektif dan Kolaborasi Tim",
    summary: "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan dengan kebutuhan kerja.",
    instructorName: "Nurul Hidayah",
    instructorAvatar: "/techwind-hero/client/06.jpg",
    materialCount: 8,
    duration: "4 jam",
    views: "1950",
    badge: "Gratis",
  },
];

const fallbackFaqs = [
  {
    id: "faq-1",
    question: "Bagaimana cara mulai belajar?",
    answer: "Jelajahi katalog, pilih materi yang sesuai kebutuhan, lalu buka halaman detail untuk melihat cara mengikuti program dan tahapan pembelajarannya.",
  },
  {
    id: "faq-2",
    question: "Apakah saya perlu membuat akun?",
    answer: "Sebagian materi dapat dijelajahi secara publik. Namun untuk mencatat progres, bookmark, dan mengakses kelas resmi Moodle, Anda perlu masuk menggunakan akun organisasi Anda.",
  },
  {
    id: "faq-3",
    question: "Apakah materi dapat diakses gratis?",
    answer: "Ya, seluruh konten dan pelatihan internal disediakan untuk pengembangan kompetensi pegawai dan pembelajar resmi tanpa biaya tambahan.",
  },
  {
    id: "faq-4",
    question: "Bagaimana cara mendapatkan sertifikat?",
    answer: "Selesaikan seluruh modul dan evaluasi pada program pelatihan formal Moodle yang bersangkutan untuk menerbitkan sertifikat kelulusan terverifikasi.",
  },
  {
    id: "faq-5",
    question: "Bagaimana jika mengalami kendala teknis?",
    answer: "Kunjungi Pusat Bantuan kami atau gunakan formulir kontak untuk menghubungi tim pengelola sistem.",
  },
  {
    id: "faq-6",
    question: "Apakah tersedia pembelajaran berbasis video?",
    answer: "Ya, platform kami menyediakan ragam format pembelajaran singkat interaktif termasuk modul video praktis, artikel bacaan mendalam, dan rekaman webinar.",
  },
];

export default async function Home() {
  const [
    faqResult,
    configuration,
    trainingResult,
    microlearningResult,
    learningPathResult,
    newsResult,
    announcementsResult,
    mediaResult,
    recommendationsResult,
  ] = await Promise.all([
    getPublicFAQs(),
    getPublicPlatformConfiguration(),
    listTrainingPrograms("", 1),
    listMicrolearning("", "", 1),
    listLearningPaths("", 1),
    getNews(1, 4),
    getAnnouncements(8),
    listMediaCollections("", "", 1),
    getCuratedRecommendations(6),
  ]);

  const curatedRecommendations = recommendationsResult.data;

  const rawFaqs = faqResult.data.flatMap((group) => group.items);
  const faqs = rawFaqs.length ? rawFaqs.slice(0, 6) : fallbackFaqs;

  const sectionProps = (key: string, defaultOrder = 99) => {
    const section = configuration.homepage.sections.find((item) => item.key === key);
    return { hidden: section ? !section.visible : false, style: { order: section?.order ?? defaultOrder } };
  };

  const bannerMedia = publicMediaPath(configuration.banner.media_id);

  // Map real catalog courses
  const realCourses = [
    ...trainingResult.data.map((item, idx) => ({
      id: `tp-${item.id}`,
      href: `/training-programs/${item.slug}`,
      image: `/techwind-hero/course/c${(idx % 10) + 1}.jpg`,
      category: "Pelatihan Penuh",
      title: item.title,
      summary: item.summary || "Bangun keterampilan melalui materi terstruktur, praktik, dan proyek yang relevan.",
      instructorName: item.audience || "Instruktur LMS",
      instructorAvatar: `/techwind-hero/client/0${(idx % 6) + 1}.jpg`,
      materialCount: item.courses?.length || 4,
      duration: "Sesuai Jadwal",
      views: "Formal LMS",
      badge: "Moodle",
    })),
    ...microlearningResult.data.map((item, idx) => ({
      id: `ml-${item.id}`,
      href: `/microlearning/${item.slug}`,
      image: item.featured_media_id ? `/media/${encodeURIComponent(item.featured_media_id)}` : `/techwind-hero/course/c${((idx + 3) % 10) + 1}.jpg`,
      category: "Pembelajaran Singkat",
      title: item.title,
      summary: item.summary || "Akses materi ringkas dan terkurasi untuk meningkatkan pemahaman kompetensi harian.",
      instructorName: "Editorial Portal",
      instructorAvatar: `/techwind-hero/client/0${((idx + 2) % 6) + 1}.jpg`,
      materialCount: 1,
      duration: `${item.duration_minutes} menit`,
      views: "Praktis",
      badge: "Singkat",
    })),
    ...learningPathResult.data.map((item, idx) => ({
      id: `lp-${item.id}`,
      href: `/learning-paths/${item.slug}`,
      image: `/techwind-hero/course/c${((idx + 6) % 10) + 1}.jpg`,
      category: "Jalur Belajar",
      title: item.version.title,
      summary: item.version.summary || "Ikuti rangkaian pembelajaran bertahap untuk membangun kompetensi terarah.",
      instructorName: "Kurikulum Terarah",
      instructorAvatar: `/techwind-hero/client/0${((idx + 4) % 6) + 1}.jpg`,
      materialCount: item.version.items.length,
      duration: `Versi ${item.version.number}`,
      views: "Roadmap",
      badge: "Jalur",
    })),
  ];

  // Ensure 6 course cards are always rendered
  const courseItems = [...realCourses, ...fallbackCourses].slice(0, 6);

  // News list
  const newsList = newsResult.data.length ? newsResult.data : [
    { id: "news-1", slug: "program-literasi-digital-diperluas", title: "Program Literasi Digital Diperluas", excerpt: "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi.", published_at: new Date().toISOString() },
    { id: "news-2", slug: "pendaftaran-pelatihan-kepemimpinan-dibuka", title: "Pendaftaran Pelatihan Kepemimpinan Dibuka", excerpt: "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi.", published_at: new Date().toISOString() },
    { id: "news-3", slug: "webinar-keamanan-data-untuk-pekerja-digital", title: "Webinar Keamanan Data untuk Pekerja Digital", excerpt: "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi.", published_at: new Date().toISOString() },
    { id: "news-4", slug: "jalur-belajar-analisis-data-kini-tersedia", title: "Jalur Belajar Analisis Data Kini Tersedia", excerpt: "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi.", published_at: new Date().toISOString() },
  ];

  // Announcements list
  const announcementItems = announcementsResult.data.length ? announcementsResult.data.slice(0, 4) : [
    { id: "ann-1", slug: "dokumentasi-orientasi-peserta", title: "Dokumentasi Orientasi Peserta", body: "" },
    { id: "ann-2", slug: "lokakarya-kepemimpinan-kolaboratif", title: "Lokakarya Kepemimpinan Kolaboratif", body: "" },
    { id: "ann-3", slug: "webinar-keamanan-data", title: "Webinar Keamanan Data", body: "" },
    { id: "ann-4", slug: "praktik-analisis-data", title: "Praktik Analisis Data", body: "" },
  ];

  // Media gallery list
  const mediaItems = mediaResult.data.length ? mediaResult.data.slice(0, 5).map((col, idx) => {
    const cover = col.items.find((it) => it.featured) || col.items[0];
    return {
      id: col.id,
      slug: col.slug,
      title: col.title,
      kind: col.kind,
      image: cover ? `/media/${encodeURIComponent(cover.media_id)}` : `/techwind-hero/portfolio/${(idx % 12) + 1}.jpg`,
    };
  }) : [
    { id: "med-1", slug: "pemeliharaan-layanan-pembelajaran", title: "Pemeliharaan Layanan Pembelajaran", kind: "image_gallery", image: "/techwind-hero/portfolio/10.jpg" },
    { id: "med-2", slug: "pendaftaran-pelatihan-kepemimpinan", title: "Pendaftaran Pelatihan Kepemimpinan", kind: "image_gallery", image: "/techwind-hero/portfolio/2.jpg" },
    { id: "med-3", slug: "perubahan-jadwal-webinar-nasional", title: "Perubahan Jadwal Webinar Nasional", kind: "image_gallery", image: "/techwind-hero/portfolio/11.jpg" },
    { id: "med-4", slug: "sosialisasi-platform-teman-belajar", title: "Sosialisasi Platform Teman Belajar", kind: "image_gallery", image: "/techwind-hero/portfolio/4.jpg" },
    { id: "med-5", slug: "peluncuran-kurikulum-digital", title: "Peluncuran Kurikulum Digital", kind: "image_gallery", image: "/techwind-hero/portfolio/5.jpg" },
  ];

  // Search preview items across all content domains for Section 3
  const searchableItems: HomepageSearchItem[] = [
    // 1. Courses
    ...fallbackCourses.map((course) => ({
      id: `srch-c-${course.id}`,
      slug: String(course.id),
      title: course.title,
      summary: course.summary,
      image: course.image,
      domain: "course" as const,
      domainLabel: "Kelas",
      detailUrl: course.href,
      actionLabel: "Lihat kelas",
      badge: course.badge || "Kelas",
      metaValue: `${course.materialCount} Materi`,
    })),
    // 2. Training Programs
    ...trainingResult.data.map((prog, idx) => ({
      id: `srch-tp-${prog.id}`,
      slug: prog.slug,
      title: prog.title,
      summary: prog.summary || "Program pelatihan penuh terstruktur dengan kurikulum bertahap.",
      image: `/techwind-hero/course/c${((idx + 2) % 10) + 1}.jpg`,
      domain: "training" as const,
      domainLabel: "Pelatihan Penuh",
      detailUrl: `/training-programs/${prog.slug}`,
      actionLabel: "Lihat pelatihan",
      badge: "Program Penuh",
      metaValue: `${prog.courses?.length || 0} Course`,
    })),
    // 3. Microlearning
    ...microlearningResult.data.map((ml, idx) => ({
      id: `srch-ml-${ml.id}`,
      slug: ml.slug,
      title: ml.title,
      summary: ml.summary || "Akses materi ringkas dan terkurasi untuk pemahaman kompetensi harian.",
      image: ml.featured_media_id ? `/media/${encodeURIComponent(ml.featured_media_id)}` : `/techwind-hero/course/c${((idx + 4) % 10) + 1}.jpg`,
      domain: "microlearning" as const,
      domainLabel: "Pembelajaran Singkat",
      detailUrl: `/microlearning/${ml.slug}`,
      actionLabel: "Pelajari materi",
      badge: "3-15 Menit",
      metaValue: `${ml.duration_minutes} menit`,
    })),
    // 4. Learning Paths
    ...learningPathResult.data.map((lp, idx) => ({
      id: `srch-lp-${lp.id}`,
      slug: lp.slug,
      title: lp.version.title,
      summary: lp.version.summary || "Ikuti rangkaian pembelajaran bertahap untuk membangun kompetensi terarah.",
      image: `/techwind-hero/course/c${((idx + 6) % 10) + 1}.jpg`,
      domain: "learningPath" as const,
      domainLabel: "Jalur Belajar",
      detailUrl: `/learning-paths/${lp.slug}`,
      actionLabel: "Lihat jalur",
      badge: "Roadmap",
      metaValue: `${lp.version.items?.length || 0} Langkah`,
    })),
    // 5. News
    ...newsList.map((news, idx) => ({
      id: `srch-news-${news.id}`,
      slug: news.slug,
      title: news.title,
      summary: news.excerpt || "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran.",
      image: `/techwind-hero/blog/0${(idx % 6) + 2}.jpg`,
      domain: "news" as const,
      domainLabel: "Berita",
      detailUrl: `/news/${news.slug}`,
      actionLabel: "Baca berita",
      badge: "Berita Terkini",
      metaValue: news.published_at ? formatDate(news.published_at) : "Editorial",
    })),
    // 6. Announcements
    ...announcementItems.map((ann, idx) => ({
      id: `srch-ann-${ann.id}`,
      slug: ann.slug,
      title: ann.title,
      summary: "Pemberitahuan resmi dan informasi operasional platform pembelajaran.",
      image: `/techwind-hero/portfolio/${(idx % 6) + 1}.jpg`,
      domain: "announcement" as const,
      domainLabel: "Pengumuman",
      detailUrl: `/announcements/${ann.slug}`,
      actionLabel: "Lihat pengumuman",
      badge: "Pengumuman",
      metaValue: "Resmi",
    })),
  ];

  return (
    <div className="flex flex-col">
      {configuration.banner.enabled ? (
        <aside className="border-b border-sky-200 bg-sky-50" aria-label="Informasi utama" style={{ order: 0 }}>
          <div className="portal-container flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            {bannerMedia ? <img src={bannerMedia} alt="" className="h-14 w-20 rounded-lg object-cover" /> : null}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{configuration.banner.title}</p>
              <p className="mt-1 text-sm text-slate-600">{configuration.banner.body}</p>
            </div>
            {configuration.banner.href ? (
              <Link href={configuration.banner.href} className="portal-button-secondary shrink-0">
                Selengkapnya
              </Link>
            ) : null}
          </div>
        </aside>
      ) : null}

      {/* 1. HERO SLIDER (#beranda) */}
      <div {...sectionProps("hero", 1)} data-techwind-pattern="index-course-hero" id="beranda">
        <TechwindHeroSlider slides={heroSlides} />
      </div>

      {/* 2. PEMBELAJARAN SAYA (#pembelajaran-saya) */}
      <section
        {...sectionProps("learning", 2)}
        className="relative md:py-24 py-16 overflow-hidden bg-white dark:bg-slate-900"
        id="pembelajaran-saya"
      >
        <div className="container relative">
          <div className="grid grid-cols-1 pb-8 text-center">
            <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
              Pembelajaran Saya
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Lanjutkan kelas aktif dan pantau perkembangan kompetensi Anda melalui materi yang terstruktur dan relevan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-[30px]">
            {courseItems.map((course) => (
              <TechwindCourseCard
                key={course.id}
                href={course.href}
                image={course.image}
                category={course.category}
                title={course.title}
                summary={course.summary}
                instructorName={course.instructorName}
                instructorAvatar={course.instructorAvatar}
                materialCount={course.materialCount}
                duration={course.duration}
                views={course.views}
                badge={course.badge}
              />
            ))}
          </div>

          <div className="grid md:grid-cols-12 grid-cols-1 mt-8">
            <div className="md:col-span-12 flex flex-wrap items-center justify-center gap-3 text-center">
              <Link
                className="py-2.5 px-6 inline-flex items-center justify-center gap-2 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-primary hover:bg-primary/90 border-primary text-white rounded-md transition-all shadow-sm group"
                href="/catalog"
              >
                <span>Buka Katalog Terpadu</span>
                <svg className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                className="py-2.5 px-6 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm"
                href="/training-programs"
              >
                <span>Lihat Pelatihan Formal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2B. REKOMENDASI PILIHAN EDITOR (#rekomendasi) */}
      {curatedRecommendations.length > 0 ? (
        <section
          {...sectionProps("recommendations", 2)}
          className="relative md:py-24 py-16 bg-gray-50 dark:bg-slate-800"
          id="rekomendasi"
        >
          <div className="container relative">
            <div className="grid md:grid-cols-12 grid-cols-1 pb-8 items-end">
              <div className="lg:col-span-8 md:col-span-6 md:text-start text-center">
                <span className="text-primary text-sm font-bold uppercase tracking-wider block mb-2">
                  Kurasi Spesial
                </span>
                <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
                  Rekomendasi Pilihan Editor
                </h2>
                <p className="text-slate-400 max-w-xl text-base">
                  Materi terpilih yang dikurasi khusus oleh tim editorial untuk mendukung akselerasi kompetensi Anda.
                </p>
              </div>
              <div className="lg:col-span-4 md:col-span-6 md:text-end hidden md:block">
                <Link
                  className="relative inline-flex items-center gap-1.5 font-semibold tracking-wide text-base text-slate-400 hover:text-primary duration-500 ease-in-out group"
                  href="/catalog"
                >
                  <span>Lihat Semua Katalog</span>
                  <svg className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-[30px] mt-8">
              {curatedRecommendations.map((item, idx) => (
                <div
                  key={`rec-${item.target_type}-${item.target_id}`}
                  className="group rounded-md shadow-sm dark:shadow-gray-800 bg-white dark:bg-slate-900 transition-all duration-500 hover:scale-[1.02] hover:shadow-md flex flex-col overflow-hidden"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={`/techwind-hero/course/c${((idx + 1) % 10) + 1}.jpg`}
                      alt=""
                      className="w-full h-48 object-cover group-hover:scale-105 duration-500"
                    />
                    <div className="absolute top-4 start-4">
                      <span className="bg-primary/90 text-white text-[12px] px-2.5 py-1 font-semibold rounded-full flex items-center gap-1 shadow-sm">
                        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Pilihan Editor
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {item.target_type === "microlearning" ? "Pembelajaran Singkat" : "Pusat Pengetahuan"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.published_at ? formatDate(item.published_at) : "Unggulan"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary duration-300 line-clamp-2">
                      <Link href={item.url}>
                        {item.title}
                      </Link>
                    </h3>

                    {item.summary && (
                      <p className="text-slate-400 text-sm mt-3 line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    <div className="mt-auto pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <svg className="size-3.5 text-primary inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Terkurasi
                      </span>
                      <Link
                        href={item.url}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 duration-300"
                      >
                        <span>Pelajari</span>
                        <svg className="size-3.5 inline-block transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. PUSAT PEMBELAJARAN DAN PENGETAHUAN (#pusat-pengetahuan & #cari) */}
      <section
        {...sectionProps("search", 3)}
        className="relative md:py-24 py-16 bg-gray-50 dark:bg-slate-800"
        id="pusat-pengetahuan"
        aria-labelledby="search-heading"
      >
        <div className="container relative">
          <div className="grid grid-cols-1 pb-8 text-center">
            <span className="text-primary font-semibold uppercase tracking-wider text-sm">
              Pusat pembelajaran dan pengetahuan
            </span>
            <h2
              className="mt-2 mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white"
              id="search-heading"
            >
              Temukan Materi untuk Tujuan Anda
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              Cari kelas, pelatihan penuh, pembelajaran singkat, webinar, jalur belajar, berita, dan pengumuman berdasarkan kebutuhan Anda.
            </p>
          </div>

          <HomepageSearchSection
            initialItems={searchableItems}
            totalAvailableCount={searchableItems.length}
          />
        </div>
      </section>

      {/* 4. BERITA UNGGULAN KAMI (#berita) */}
      <section
        {...sectionProps("news", 4)}
        className="relative md:py-24 py-16 bg-white dark:bg-slate-900"
        id="berita"
      >
        <div className="container relative">
          <div className="grid md:grid-cols-12 grid-cols-1 pb-8 items-end">
            <div className="lg:col-span-8 md:col-span-6 md:text-start text-center">
              <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
                Berita Unggulan Kami
              </h2>
              <p className="text-slate-400 max-w-xl text-base">
                Ikuti kabar terbaru tentang program dan layanan pembelajaran.
              </p>
            </div>
            <div className="lg:col-span-4 md:col-span-6 md:text-end hidden md:block">
              <Link
                className="relative inline-flex items-center gap-1.5 font-semibold tracking-wide text-base text-slate-400 hover:text-primary duration-500 ease-in-out group"
                href="/news"
              >
                <span>Semua Berita</span>
                <svg className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-12 grid-cols-1 mt-8 gap-[30px]">
            {/* Left Column: Horizontal News Cards */}
            <div className="lg:col-span-8 md:col-span-6">
              <div className="grid grid-cols-1 gap-[30px]">
                {newsList.map((news, idx) => (
                  <TechwindHorizontalNewsCard
                    key={news.id}
                    href={`/news/${news.slug}`}
                    image={`/techwind-hero/blog/0${(idx % 6) + 2}.jpg`}
                    title={news.title}
                    summary={news.excerpt || "Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi."}
                  />
                ))}
              </div>
            </div>

            {/* Right Column: Sticky Sidebar */}
            <div className="lg:col-span-4 md:col-span-6">
              <div className="sticky top-24">
                {/* Box 1: Postingan Terbaru */}
                <h5 className="text-base font-bold bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-gray-800 rounded-md p-3 text-center text-slate-900 dark:text-white">
                  Postingan Terbaru
                </h5>
                <div className="mt-5 space-y-4">
                  {newsList.slice(0, 3).map((news, idx) => (
                    <div key={`recent-${news.id}`} className="flex items-center gap-3">
                      <img
                        src={`/techwind-hero/blog/0${(idx % 6) + 2}.jpg`}
                        alt=""
                        className="size-16 rounded-md object-cover shadow-sm shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/news/${news.slug}`}
                          className="font-semibold text-sm hover:text-primary duration-300 block line-clamp-2 text-slate-900 dark:text-white"
                        >
                          {news.title}
                        </Link>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {news.published_at ? formatDate(news.published_at) : "Baru saja"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Box 2: Jelajahi */}
                <h5 className="text-base font-bold bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-gray-800 rounded-md p-3 text-center mt-8 text-slate-900 dark:text-white">
                  Jelajahi
                </h5>
                <ul className="list-none text-center mt-5 flex flex-wrap justify-center gap-2">
                  <li>
                    <Link
                      className="size-9 inline-flex items-center justify-center text-base text-gray-400 hover:text-white border border-gray-100 dark:border-gray-800 rounded-md hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary duration-500 transition-colors"
                      href="/learning-paths"
                      aria-label="Jalur belajar"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="size-9 inline-flex items-center justify-center text-base text-gray-400 hover:text-white border border-gray-100 dark:border-gray-800 rounded-md hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary duration-500 transition-colors"
                      href="/news"
                      aria-label="Berita"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="size-9 inline-flex items-center justify-center text-base text-gray-400 hover:text-white border border-gray-100 dark:border-gray-800 rounded-md hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary duration-500 transition-colors"
                      href="/announcements"
                      aria-label="Pengumuman"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="size-9 inline-flex items-center justify-center text-base text-gray-400 hover:text-white border border-gray-100 dark:border-gray-800 rounded-md hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary duration-500 transition-colors"
                      href="/help"
                      aria-label="Pertanyaan yang sering diajukan"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="size-9 inline-flex items-center justify-center text-base text-gray-400 hover:text-white border border-gray-100 dark:border-gray-800 rounded-md hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary duration-500 transition-colors"
                      href="/media-gallery"
                      aria-label="Media dan galeri"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </Link>
                  </li>
                </ul>

                {/* Box 3: Tag Populer */}
                <h5 className="text-base font-bold bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-gray-800 rounded-md p-3 text-center mt-8 text-slate-900 dark:text-white">
                  Tag Populer
                </h5>
                <ul className="list-none text-center mt-5 flex flex-wrap justify-center gap-2">
                  {["Pembelajaran", "Kompetensi", "Digital", "Kepemimpinan", "Kolaborasi", "Produktivitas", "Data", "Keamanan"].map((tag) => (
                    <li key={tag} className="inline-block">
                      <Link
                        className="px-3 py-1 text-slate-400 hover:text-white dark:hover:text-white bg-gray-50 dark:bg-slate-800 text-xs hover:bg-primary dark:hover:bg-primary rounded-md shadow-sm dark:shadow-gray-800 duration-500 inline-block font-medium transition-colors"
                        href={`/search?q=${encodeURIComponent(tag.toLowerCase())}`}
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PENGUMUMAN (#pengumuman) */}
      <section
        {...sectionProps("announcements", 5)}
        className="relative md:py-24 py-16 bg-gray-50 dark:bg-slate-800"
        id="pengumuman"
      >
        <div className="container relative">
          <div className="grid grid-cols-1 pb-8 text-center">
            <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
              Pengumuman
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Informasi dan pemberitahuan resmi terbaru untuk Anda.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-6 mt-8">
            {announcementItems.map((ann, idx) => (
              <TechwindPortfolioCard
                key={ann.id}
                href={`/announcements/${ann.slug}`}
                image={`/techwind-hero/portfolio/${(idx % 6) + 1}.jpg`}
                title={ann.title}
                subtitle="Pengumuman"
                aspect="aspect-[4/3]"
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              className="py-2 px-5 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm"
              href="/announcements"
            >
              <span>Selengkapnya</span>
              <i className="ri-arrow-right-line align-middle text-lg" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. MEDIA & GALERI (#media) */}
      <section
        {...sectionProps("media", 6)}
        className="relative md:py-24 py-16 bg-white dark:bg-slate-900"
        id="media"
      >
        <div className="container relative">
          <div className="grid grid-cols-1 pb-8 text-center">
            <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
              Media &amp; Galeri
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Dokumentasi kegiatan dan galeri media kami.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <ul className="mb-0 list-none flex items-center gap-4">
              <li className="inline-block font-semibold text-base cursor-pointer relative text-primary border-b-2 border-primary pb-1">
                <Link href="/media-gallery">Semua</Link>
              </li>
              <li className="inline-block font-semibold text-base cursor-pointer relative text-slate-400 hover:text-primary duration-500 pb-1">
                <Link href="/media-gallery?kind=image_gallery">Foto</Link>
              </li>
              <li className="inline-block font-semibold text-base cursor-pointer relative text-slate-400 hover:text-primary duration-500 pb-1">
                <Link href="/media-gallery?kind=video_hub">Video</Link>
              </li>
            </ul>
          </div>

          <div className="grid lg:grid-cols-5 md:grid-cols-3 grid-cols-2 gap-4 mt-6">
            {mediaItems.map((media) => (
              <TechwindPortfolioCard
                key={media.id}
                href={`/media-gallery/${media.slug}`}
                image={media.image}
                title={media.title}
                subtitle={media.kind === "video_hub" ? "Video Hub" : "Galeri Foto"}
                aspect="aspect-square"
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              className="py-2 px-5 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm"
              href="/media-gallery"
            >
              <span>Selengkapnya</span>
              <i className="ri-arrow-right-line align-middle text-lg" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. PERTANYAAN YANG SERING DIAJUKAN (#faq) */}
      <section
        {...sectionProps("faq", 7)}
        className="relative md:py-24 py-16 bg-gray-50 dark:bg-slate-800"
        id="faq"
      >
        <div className="container relative">
          <div className="grid grid-cols-1 pb-8 text-center">
            <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Temukan jawaban atas pertanyaan umum terkait platform dan layanan kami.
            </p>
          </div>

          <TechwindFaqSection faqs={faqs} />
        </div>
      </section>
    </div>
  );
}
