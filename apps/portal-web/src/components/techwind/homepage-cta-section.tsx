import Link from "next/link";
import type { HTMLAttributes } from "react";

interface HomepageCtaSectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function HomepageCtaSection({
  title = "Siap Mengembangkan Kompetensi Anda?",
  description = "Akses ragam program pelatihan formal terstruktur, materi pembelajaran singkat terkurasi, dan jalur belajar keahlian untuk mencapai keunggulan profesional Anda.",
  primaryActionLabel = "Jelajahi Katalog Lengkap",
  primaryActionHref = "/catalog",
  secondaryActionLabel = "Pembelajaran Singkat",
  secondaryActionHref = "/microlearning",
  ...props
}: HomepageCtaSectionProps) {
  return (
    <section
      {...props}
      data-techwind-pattern="homepage-cta-banner"
      id="ajakan-belajar"
      className="relative md:py-24 py-16 bg-slate-900 overflow-hidden text-white"
    >
      {/* Background Decorative Orbs */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-12 md:grid-cols-1 items-center gap-8 text-center lg:text-start">
          <div className="lg:col-span-8">
            <span className="bg-primary/20 text-primary-300 border border-primary/30 text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full inline-block mb-4">
              Mulai Langkah Anda
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white mb-4">
              {title}
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center justify-center lg:items-end gap-3.5">
            <Link
              href={primaryActionHref}
              className="py-3 px-7 w-full sm:w-auto lg:w-full inline-flex items-center justify-center gap-2 font-bold tracking-wide border align-middle duration-500 text-base text-center bg-primary hover:bg-primary/90 border-primary text-white rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              <span>{primaryActionLabel}</span>
              <svg
                className="size-4 inline-block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href={secondaryActionHref}
              className="py-3 px-7 w-full sm:w-auto lg:w-full inline-flex items-center justify-center gap-2 font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl backdrop-blur-sm transition-all"
            >
              <span>{secondaryActionLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
