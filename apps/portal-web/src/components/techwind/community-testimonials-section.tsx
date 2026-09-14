/* eslint-disable @next/next/no-img-element -- static verified client avatars in public directory */
import type { HTMLAttributes } from "react";

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  organization: string;
  avatar: string;
  quote: string;
  rating?: number;
}

const defaultTestimonials: TestimonialItem[] = [
  {
    id: "t1",
    name: "Thomas Israel",
    role: "Analis Kebijakan Ahli Pertama",
    organization: "Biro Manajemen Strategis",
    avatar: "/techwind-hero/client/01.jpg",
    quote:
      "Materi pembelajaran singkat dan terstruktur di Teman Belajar sangat membantu saya mempercepat pemahaman regulasi baru di sela-sela kesibukan dinas sehari-hari.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Barbara McIntosh",
    role: "Pranata Komputer Madya",
    organization: "Pusat Data & Sistem Informasi",
    avatar: "/techwind-hero/client/05.jpg",
    quote:
      "Jalur Belajar data dan keamanan siber memberikan roadmap yang sangat jelas dan terukur bagi tim teknis kami dalam mengawal inisiatif transformasi digital.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Carl Oliver",
    role: "Widyaiswara Ahli Muda",
    organization: "Pusat Pelatihan & Pengembangan",
    avatar: "/techwind-hero/client/03.jpg",
    quote:
      "Integrasi mulus antara kurikulum portal dan LMS formal Moodle memudahkan monitoring perkembangan peserta dan penerbitan sertifikat kelulusan secara transparan.",
    rating: 5,
  },
];

interface CommunityTestimonialsSectionProps extends HTMLAttributes<HTMLElement> {
  testimonials?: TestimonialItem[];
}

export function CommunityTestimonialsSection({
  testimonials = defaultTestimonials,
  ...props
}: CommunityTestimonialsSectionProps) {
  return (
    <section
      {...props}
      data-techwind-pattern="community-testimonials"
      id="suara-pembelajar"
      className="relative md:py-24 py-16 bg-white dark:bg-slate-900"
    >
      <div className="container relative">
        <div className="grid grid-cols-1 pb-8 text-center">
          <span className="text-primary text-sm font-bold uppercase tracking-wider block mb-2">
            Suara Pembelajar
          </span>
          <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
            Apa Kata Mereka Tentang Teman Belajar
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Pengalaman nyata aparatur dan profesional dalam mengembangkan kompetensi dan pengetahuan terarah.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-[30px] mt-8">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl shadow-sm dark:shadow-gray-800 p-6 sm:p-8 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
            >
              <div>
                <div className="flex items-center pb-5 border-b border-slate-200/60 dark:border-slate-700/60">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="size-14 rounded-full shadow-sm object-cover border-2 border-white dark:border-slate-700"
                  />
                  <div className="ps-4 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs font-semibold text-primary truncate mt-0.5">
                      {item.role}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                      {item.organization}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400 text-sm" aria-label="Rating 5 bintang">
                  {[...Array(item.rating || 5)].map((_, i) => (
                    <i key={i} className="ri-star-fill leading-none" />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Terverifikasi
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
