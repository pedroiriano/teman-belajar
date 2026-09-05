import Link from "next/link";
import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { PortalIcon, type PortalIconName } from "@/components/portal-icon";

export { TechwindHeroSlider } from "./hero-slider";
export type { TechwindHeroSlide } from "./hero-slider";
export { FullScreenHero } from "./full-screen-hero";
export type { FullScreenHeroProps } from "./full-screen-hero";
export { TabFilters } from "./tab-filters";
export { FAQSidebar, FAQAccordionController } from "./faq-sidebar";
export { MediaLightbox } from "./media-lightbox";
export type { LightboxItem } from "./media-lightbox";
export { TechwindFaqSection, type FaqItem } from "@/components/techwind-faq-section";
export { HomepageSearchSection, type HomepageSearchItem } from "@/components/homepage-search-section";
export { DetailSidebar, type QuickFactItem, type InstructorItem, type DetailSidebarProps } from "./detail-sidebar";
export { RelatedContentSection, type RelatedContentSectionProps } from "./related-content-section";
export {
  TechwindCourseCardSkeleton,
  MicrolearningCardSkeleton,
  LearningPathCardSkeleton,
  TechwindNewsCardSkeleton,
  PageHeroSkeleton,
  CatalogGridSkeleton,
} from "./skeletons";

export type PaginationData = { page: number; page_size: number; total: number; total_pages: number };

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "teal" | "amber";
  icon?: PortalIconName;
};

export function PageHero({ eyebrow, title, description, tone = "teal", icon = "graduation" }: PageHeroProps) {
  return (
    <section className="portal-page-hero" data-techwind-pattern="course-inner-hero">
      <div className="portal-page-hero-orb portal-page-hero-orb-one" aria-hidden="true" />
      <div className="portal-page-hero-orb portal-page-hero-orb-two" aria-hidden="true" />
      <div className="portal-container relative grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20">
        <div>
          <p className={cx("portal-eyebrow", tone === "amber" && "portal-eyebrow-warm")}>{eyebrow}</p>
          <h1 className="portal-page-hero-title">{title}</h1>
          <p className="portal-page-hero-copy">{description}</p>
        </div>
        <div className="portal-page-hero-visual" aria-hidden="true">
          <span className="portal-page-hero-icon"><PortalIcon name={icon} className="h-9 w-9" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Teman Belajar</p>
            <p className="mt-1 line-clamp-2 font-extrabold text-slate-900">Pengalaman belajar terhubung</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full w-3/4 rounded-full bg-teal-500" /></div>
          </div>
          <span className="portal-page-hero-badge"><PortalIcon name="sparkles" className="h-4 w-4" /></span>
        </div>
      </div>
    </section>
  );
}

export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return <nav className="portal-container py-5" aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">/</span> : null}{item.href ? <Link href={item.href} className="hover:text-teal-700">{item.label}</Link> : <span aria-current="page" className="text-slate-700">{item.label}</span>}</li>)}</ol></nav>;
}

export function DetailHero({
  title,
  summary,
  backHref,
  backLabel,
  meta,
  aside,
  pattern = "course-detail-hero",
  backgroundImage,
  breadcrumbs,
}: {
  title: string;
  summary: string;
  backHref: string;
  backLabel: string;
  meta: ReactNode;
  aside?: ReactNode;
  pattern?: string;
  backgroundImage?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
}) {
  if (backgroundImage) {
    return (
      <div className="relative">
        <section
          className="relative table w-full py-28 lg:py-36 bg-no-repeat bg-center bg-cover overflow-hidden"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
          data-techwind-pattern={pattern}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/85 to-slate-900" />
          <div
            className={cx(
              "portal-container relative z-10 gap-10",
              aside ? "grid lg:grid-cols-[1fr_22rem] lg:items-center" : "block"
            )}
          >
            <div>
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-300 hover:text-white transition-colors mb-3"
              >
                {backLabel}
              </Link>
              <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl leading-tight mb-4">
                {title}
              </h1>
              <p className={cx("text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed mb-6", !aside && "mx-auto")}>
                {summary}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-white/80">
                {meta}
              </div>
            </div>
            {aside}
          </div>
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="absolute text-center z-10 bottom-5 inset-x-0 mx-3">
              <nav aria-label="Breadcrumb">
                <ol className="tracking-[0.5px] mb-0 inline-flex flex-wrap items-center justify-center gap-1.5 text-xs uppercase font-bold text-white/60">
                  {breadcrumbs.map((item, index) => (
                    <li
                      key={`${item.label}-${index}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      {index > 0 && (
                        <span className="text-white/40" aria-hidden="true">
                          /
                        </span>
                      )}
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-white/60 hover:text-white duration-300 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-white" aria-current="page">
                          {item.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          ) : null}
        </section>
        <div className="relative">
          <div className="shape absolute sm:-bottom-px -bottom-0.5 inset-x-0 overflow-hidden z-2 text-white dark:text-slate-900 pointer-events-none">
            <svg
              className="w-full h-auto scale-[2.0] origin-top"
              viewBox="0 0 2880 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M0 48H1437.5H2880V0H2160C1442.5 52 720 0 720 0H0V48Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="portal-course-hero border-b border-slate-200"
      data-techwind-pattern={pattern}
    >
      <div className="portal-course-hero-shape portal-course-hero-shape-one" aria-hidden="true" />
      <div className="portal-course-hero-shape portal-course-hero-shape-two" aria-hidden="true" />
      <div
        className={cx(
          "portal-container relative z-10 gap-10 py-14 lg:py-20",
          aside ? "grid lg:grid-cols-[1fr_22rem] lg:items-center" : "block"
        )}
      >
        <div>
          <Link href={backHref} className="portal-course-hero-label">
            {backLabel}
          </Link>
          <h1 className="portal-course-hero-title">{title}</h1>
          <p className={cx("portal-course-hero-copy", !aside && "mx-auto")}>{summary}</p>
          <div className="portal-course-hero-trust">{meta}</div>
        </div>
        {aside}
      </div>
    </section>
  );
}

export function CourseDetailHero({
  title,
  summary,
  backHref,
  backLabel,
  meta,
  aside,
  backgroundImage,
  breadcrumbs,
}: {
  title: string;
  summary: string;
  backHref: string;
  backLabel: string;
  meta: ReactNode;
  aside?: ReactNode;
  backgroundImage?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
}) {
  return (
    <DetailHero
      title={title}
      summary={summary}
      backHref={backHref}
      backLabel={backLabel}
      meta={meta}
      aside={aside}
      backgroundImage={backgroundImage}
      breadcrumbs={breadcrumbs}
    />
  );
}

export function ContentCard({ children, className, ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <article {...props} className={cx("portal-card", className)}>{children}</article>;
}

export function EditorialCard({ href, title, summary, label = "Panduan", dateLabel, actionLabel = "Baca artikel", headingLevel = "h2", icon = "book" }: { href: string; title: string; summary?: string; label?: string; dateLabel?: string; actionLabel?: string; headingLevel?: "h2" | "h3"; icon?: PortalIconName }) {
  const Heading = headingLevel;
  return (
    <ContentCard className="portal-course-card group overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl dark:shadow-gray-800 hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full">
      <div className="relative overflow-hidden flex h-32 items-center justify-between bg-gradient-to-br from-slate-900 via-primary-900 to-primary p-6 text-white">
        <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-white">
          {label}
        </span>
        <PortalIcon name={icon} className="h-9 w-9 text-white/80 group-hover:scale-110 group-hover:text-white transition-all duration-500" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading className="text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-500">
          <Link href={href}>{title}</Link>
        </Heading>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 grow">
          {summary || "Buka artikel untuk membaca panduan selengkapnya."}
        </p>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-400">
          <span>{dateLabel || "Konten terkurasi"}</span>
          <Link href={href} className="shrink-0 font-bold text-sm text-primary group-hover:translate-x-1.5 duration-500 transition-transform">
            {actionLabel} →
          </Link>
        </div>
      </div>
    </ContentCard>
  );
}


export function EditorialDetailHero({ eyebrow, title, summary, breadcrumbs, meta, visual }: { eyebrow: string; title: string; summary?: string; breadcrumbs: Array<{ href?: string; label: string }>; meta?: ReactNode; visual?: "news" | "announcement" }) {
  return <header className={cx("portal-hero relative overflow-hidden text-white", visual && `is-${visual}`)} data-techwind-pattern="blog-detail-hero"><div className="portal-hero-orb portal-hero-orb-one" aria-hidden="true" /><div className="portal-hero-orb portal-hero-orb-two" aria-hidden="true" /><div className={cx("portal-container relative text-center", visual ? "py-24 sm:py-32 lg:py-40" : "py-16 sm:py-24")}><nav aria-label="Breadcrumb" className="mb-6"><ol className="flex flex-wrap justify-center gap-2 text-sm text-teal-100">{breadcrumbs.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">/</span> : null}{item.href ? <Link href={item.href} className="font-bold hover:text-white">{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav><p className="mx-auto w-fit rounded-full bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[.18em] text-teal-200">{eyebrow}</p><h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">{title}</h1>{summary ? <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{summary}</p> : null}{meta ? <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-300">{meta}</div> : null}</div></header>;
}

export function EditorialBody({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return <div className="portal-container max-w-4xl py-10 sm:py-14"><div className="portal-card p-6 sm:p-10">{children}{footer ? <footer className="mt-10 border-t border-slate-200 pt-6">{footer}</footer> : null}</div></div>;
}

export function FilterBar({ children, className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props} className={cx("portal-card", className)}>{children}</form>;
}

export function SearchField({ id, name, label, placeholder, defaultValue, maxLength = 200, inputClassName, compact = false, required = true, className, showLabel = true }: { id: string; name: string; label: string; placeholder: string; defaultValue?: string; maxLength?: number; inputClassName?: string; compact?: boolean; required?: boolean; className?: string; showLabel?: boolean }) {
  return <div className={className}><label htmlFor={id} className={showLabel ? "portal-label" : "portal-label sr-only"}>{label}</label><div className={cx("relative", !compact && "mt-2")}><PortalIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id={id} name={name} type="search" required={required} maxLength={maxLength} defaultValue={defaultValue} placeholder={placeholder} className={cx("portal-search-input w-full !rounded-xl !pl-12", inputClassName)} /></div></div>;
}

export function SelectField({ id, name, label, defaultValue, options, className }: { id: string; name: string; label: string; defaultValue?: string; options: Array<{ value: string; label: string }>; className?: string }) {
  return <div className={className}><label htmlFor={id} className="portal-label">{label}</label><select id={id} name={name} defaultValue={defaultValue} className="portal-control mt-2 w-full">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("portal-badge", className)}>{children}</span>;
}

export function TrainingProgramCard({
  href,
  title,
  summary,
  audience,
  courseCount,
  cohortStatus,
  progress,
  completed,
  headingLevel = "h2",
}: {
  href: string;
  title: string;
  summary: string;
  audience?: string;
  courseCount: number;
  cohortStatus?: { label: string; className?: string };
  progress?: number;
  completed?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const isDone = Boolean(completed || (progress !== undefined && progress >= 100));
  return (
    <ContentCard className="portal-course-card p-6 flex flex-col h-full group hover:-translate-y-1.5 hover:shadow-xl dark:shadow-gray-800 transition-all duration-500 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">Program penuh</Badge>
          {isDone ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span>✓</span> Selesai
            </span>
          ) : progress !== undefined && progress > 0 ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <span>●</span> {progress}% Selesai
            </span>
          ) : cohortStatus ? (
            <span className={cx("text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block", cohortStatus.className)}>
              {cohortStatus.label}
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <PortalIcon name="graduation" className="h-4 w-4 text-primary" />
          {courseCount} course
        </span>
      </div>
      <Heading className="mt-4 text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-500">
        <Link href={href}>{title}</Link>
      </Heading>
      <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 grow">{summary}</p>
      {audience ? (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
          <PortalIcon name="user" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Untuk: {audience}</span>
        </div>
      ) : null}
      {(progress !== undefined || completed) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Progres Belajar</span>
            <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-teal-600 dark:text-teal-400 font-bold"}>
              {isDone ? "100%" : `${progress ?? 0}%`}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-teal-500"}`}
              style={{ width: `${isDone ? 100 : Math.min(100, Math.max(0, progress ?? 0))}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="text-xs font-semibold text-slate-400">Kurikulum Moodle</span>
        <Link href={href} className="inline-flex items-center gap-1 font-bold text-sm text-primary group-hover:translate-x-1.5 duration-500 transition-transform">
          {isDone ? "Ulas materi →" : progress ? "Lanjutkan belajar →" : "Lihat program →"}
        </Link>
      </div>
    </ContentCard>
  );
}

/* eslint-disable @next/next/no-img-element -- media route is access-controlled and cannot use the image optimizer. */
export function MicrolearningCard({
  href,
  title,
  summary,
  formatLabel,
  durationMinutes,
  featuredMediaId,
  progress,
  completed,
  headingLevel = "h2",
}: {
  href: string;
  title: string;
  summary: string;
  formatLabel: string;
  durationMinutes: number;
  featuredMediaId?: string;
  progress?: number;
  completed?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const isDone = Boolean(completed || (progress !== undefined && progress >= 100));
  return (
    <ContentCard className="portal-course-card group overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl dark:shadow-gray-800 hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full">
      <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-teal-700 to-sky-700">
        {featuredMediaId ? (
          <img
            src={`/media/${encodeURIComponent(featuredMediaId)}`}
            alt={`Ilustrasi ${title}`}
            className="h-full w-full object-cover group-hover:scale-110 duration-500 ease-in-out transition-transform"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white group-hover:scale-105 duration-500 ease-in-out transition-transform" role="img" aria-label={`Materi ${title}, ${durationMinutes} menit`}>
            <PortalIcon name="book" className="h-10 w-10 text-teal-100" />
            <span className="text-4xl font-black text-white/90">{durationMinutes}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-100">menit</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-primary/10 text-primary font-bold text-xs">{formatLabel}</Badge>
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs">{durationMinutes} menit</Badge>
          </div>
          {isDone ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span>✓</span> Selesai
            </span>
          ) : progress !== undefined && progress > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <span>●</span> {progress}% Selesai
            </span>
          ) : null}
        </div>
        <Heading className="mt-4 text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-500">
          <Link href={href}>{title}</Link>
        </Heading>
        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 grow">{summary}</p>
        {(progress !== undefined || completed) && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Progres Belajar</span>
              <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-teal-600 dark:text-teal-400 font-bold"}>
                {isDone ? "100%" : `${progress ?? 0}%`}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-teal-500"}`}
                style={{ width: `${isDone ? 100 : Math.min(100, Math.max(0, progress ?? 0))}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Pembelajaran Singkat</span>
          <Link href={href} className="font-bold text-sm text-primary group-hover:translate-x-1.5 duration-500 transition-transform">
            {isDone ? "Ulas materi →" : progress ? "Lanjutkan belajar →" : "Mulai materi →"}
          </Link>
        </div>
      </div>
    </ContentCard>
  );
}

export function MicrolearningDetailHero({
  title,
  summary,
  backHref,
  backLabel,
  formatLabel,
  durationMinutes,
  featuredMediaId,
  backgroundImage,
  breadcrumbs,
}: {
  title: string;
  summary: string;
  backHref: string;
  backLabel: string;
  formatLabel: string;
  durationMinutes: number;
  featuredMediaId?: string;
  backgroundImage?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
}) {
  return (
    <DetailHero
      pattern="microlearning-detail-hero"
      title={title}
      summary={summary}
      backHref={backHref}
      backLabel={backLabel}
      backgroundImage={backgroundImage}
      breadcrumbs={breadcrumbs}
      meta={
        <>
          <Badge className="bg-primary/20 text-white font-bold">{formatLabel}</Badge>
          <Badge className="bg-white/20 text-white font-bold">{durationMinutes} menit</Badge>
          <span>Editorial Portal</span>
          <span>Bukan completion Moodle</span>
          <span>Materi terkurasi</span>
        </>
      }
      aside={
        <ContentCard className="overflow-hidden shadow-lg border border-white/10">
          <div className="aspect-video bg-gradient-to-br from-teal-700 to-sky-700">
            {featuredMediaId ? (
              <img
                src={`/media/${encodeURIComponent(featuredMediaId)}`}
                alt={`Ilustrasi ${title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 text-white"
                role="img"
                aria-label={`Materi ${title}, ${durationMinutes} menit`}
              >
                <PortalIcon name="book" className="h-10 w-10 text-teal-100" />
                <span className="text-5xl font-black">{durationMinutes}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-100">
                  menit
                </span>
              </div>
            )}
          </div>
          <p className="p-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Selesaikan sesuai ritme Anda dan simpan posisi untuk dilanjutkan nanti.
          </p>
        </ContentCard>
      }
    />
  );
}

export function LearningPathCard({
  href,
  title,
  summary,
  version,
  itemCount,
  publishedAt,
  progress,
  completed,
  headingLevel = "h2",
}: {
  href: string;
  title: string;
  summary: string;
  version: number;
  itemCount: number;
  publishedAt?: string;
  progress?: number;
  completed?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const isDone = Boolean(completed || (progress !== undefined && progress >= 100));
  return (
    <ContentCard className="portal-course-card group p-6 flex flex-col h-full rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl dark:shadow-gray-800 hover:-translate-y-1.5 transition-all duration-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary font-bold text-xs">Versi {version}</Badge>
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs">{itemCount} langkah</Badge>
          {isDone ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span>✓</span> Selesai
            </span>
          ) : progress !== undefined && progress > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <span>●</span> {progress}% Selesai
            </span>
          ) : null}
        </div>
        {publishedAt ? (
          <span className="text-xs font-medium text-slate-400">
            {formatDate(publishedAt)}
          </span>
        ) : null}
      </div>
      <Heading className="mt-4 text-xl font-bold leading-snug text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-500">
        <Link href={href}>{title}</Link>
      </Heading>
      <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 grow">{summary}</p>
      {(progress !== undefined || completed) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Progres Belajar</span>
            <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-teal-600 dark:text-teal-400 font-bold"}>
              {isDone ? "100%" : `${progress ?? 0}%`}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-teal-500"}`}
              style={{ width: `${isDone ? 100 : Math.min(100, Math.max(0, progress ?? 0))}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Jalur Pembelajaran</span>
        <Link href={href} className="font-bold text-sm text-primary group-hover:translate-x-1.5 duration-500 transition-transform">
          {isDone ? "Ulas jalur →" : progress ? "Lanjutkan belajar →" : "Lihat jalur →"}
        </Link>
      </div>
    </ContentCard>
  );
}

export function LearningPathStepCard({
  index,
  kindLabel,
  title,
  summary,
  required,
  milestone,
  unavailable,
  locked,
  completed,
  isNext,
  isLast,
  prerequisites,
  progress,
  action,
}: {
  index: number;
  kindLabel: string;
  title: string;
  summary?: string;
  required: boolean;
  milestone: boolean;
  unavailable: boolean;
  locked: boolean;
  completed?: boolean;
  isNext?: boolean;
  isLast?: boolean;
  prerequisites?: string[];
  progress?: { label: string; value: number };
  action: ReactNode;
}) {
  return (
    <div className="relative flex gap-5 group">
      {/* Timeline vertical connector */}
      {!isLast ? (
        <span
          className="absolute left-5 top-12 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10 group-last:hidden"
          aria-hidden="true"
        />
      ) : null}

      {/* Step Indicator Avatar */}
      <div className="relative shrink-0 pt-1">
        <span
          className={cx(
            "grid h-10 w-10 place-items-center rounded-full font-bold text-sm transition-all duration-300 shadow-sm",
            completed
              ? "bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/50"
              : isNext
              ? "bg-primary text-white ring-4 ring-primary/20 shadow-md"
              : locked
              ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
              : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
          )}
          aria-label={`Langkah ${index}${completed ? " (Selesai)" : locked ? " (Terkunci)" : ""}`}
        >
          {completed ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : locked ? (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ) : (
            index
          )}
        </span>
      </div>

      {/* Content Card */}
      <ContentCard
        className={cx(
          "p-6 flex-1 border transition-all duration-300 rounded-xl mb-6",
          isNext
            ? "border-primary/40 shadow-md bg-white dark:bg-slate-900"
            : locked
            ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-80"
            : "border-slate-100 dark:border-slate-800 hover:shadow-md"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary font-bold text-xs">{kindLabel}</Badge>
            <Badge className={required ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 font-semibold text-xs" : "bg-slate-100 text-slate-600 dark:bg-slate-800 text-xs"}>
              {required ? "Wajib" : "Opsional"}
            </Badge>
            {milestone ? (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-extrabold text-xs inline-flex items-center gap-1">
                <PortalIcon name="star" className="h-3 w-3 text-amber-600" /> Milestone
              </Badge>
            ) : null}
          </div>
          <div>
            {completed ? (
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
                Selesai
              </Badge>
            ) : isNext ? (
              <Badge className="bg-primary text-white font-bold text-xs">
                Langkah Aktif
              </Badge>
            ) : locked ? (
              <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 font-semibold text-xs">
                Terkunci
              </Badge>
            ) : unavailable ? (
              <Badge className="opacity-70 text-xs">Sumber terganggu</Badge>
            ) : null}
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>
        {summary ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {summary}
          </p>
        ) : null}
        {prerequisites?.length ? (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Prasyarat:</span>
            <span>{prerequisites.join(", ")}</span>
          </div>
        ) : null}
        {progress ? (
          <Progress value={progress.value} label={progress.label} />
        ) : null}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {action}
        </div>
      </ContentCard>
    </div>
  );
}

export function CourseCard({ title, required, availability, state, summary, progress, startUrl }: { title: string; required: boolean; availability: "available" | "unavailable"; state?: string; summary?: string; progress?: number; startUrl?: string }) {
  return (
    <ContentCard className="p-5 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Course {required ? "wajib" : "opsional"}
          </span>
          <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <Badge className={availability === "unavailable" ? "opacity-70" : "bg-teal-50 text-teal-700 font-semibold"}>
          {availability === "available" ? state || "Tersedia" : "Data belum tersedia"}
        </Badge>
      </div>
      {summary ? <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{summary}</p> : null}
      {typeof progress === "number" ? <Progress value={progress} label={`Progres ${title}`} /> : null}
      {startUrl ? (
        <a href={startUrl} className="portal-button-secondary mt-4 inline-flex items-center gap-2" rel="noreferrer">
          <PortalIcon name="sparkles" className="h-4 w-4" /> Buka di Moodle
        </a>
      ) : null}
    </ContentCard>
  );
}

export function Tabs({ items, label = "Tab navigasi" }: { items: Array<{ href: string; label: string; current?: boolean }>; label?: string }) {
  return <nav className="flex gap-2 overflow-x-auto pb-2" aria-label={label}>{items.map((item) => <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} className={item.current ? "portal-filter-active" : "portal-filter"}>{item.label}</Link>)}</nav>;
}

export function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="portal-faq" open={defaultOpen}><summary>{title}</summary><div>{children}</div></details>;
}

export function Progress({ value, label, showValue = true }: { value: number; label: string; showValue?: boolean }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>{label}</span>{showValue ? <span>{safeValue}%</span> : null}</div><div className="portal-course-progress" role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${safeValue}%` }} /></div></div>;
}

export function MediaPreview({ children, label }: { children: ReactNode; label?: string }) {
  return <figure aria-label={label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{children}</figure>;
}

export function EngagementControls({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3" data-techwind-pattern="engagement-controls">{children}</div>;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-sm">
      <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-6">
          <Link
            href={actionHref}
            className="py-2.5 px-5 font-semibold border border-primary text-primary hover:bg-primary hover:text-white rounded-lg duration-300 inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{actionLabel}</span>
            <svg className="size-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      ) : onAction && actionLabel ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={onAction}
            className="py-2.5 px-5 font-semibold border border-primary text-primary hover:bg-primary hover:text-white rounded-lg duration-300 inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{actionLabel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ContentCardPlaceholder({
  domain = "Konten",
  title = "Materi Sedang Disiapkan",
  summary = "Konten pada kategori ini sedang dalam tahap kurasi editorial dan akan segera tersedia.",
}: {
  domain?: string;
  title?: string;
  summary?: string;
}) {
  return (
    <article className="flex flex-col justify-center overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 shadow-sm p-6 text-center min-h-[260px]">
      <div className="mx-auto size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <span className="text-primary text-xs font-bold uppercase tracking-wider">{domain}</span>
      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-xs text-slate-400 line-clamp-2 max-w-xs mx-auto">{summary}</p>
    </article>
  );
}

export function LoadingState({ label = "Memuat konten" }: { label?: string }) {
  return <div role="status" className="portal-card px-6 py-16 text-center"><span className="portal-badge">{label}</span><p className="mt-4 text-sm text-slate-500">Mohon tunggu sebentar.</p></div>;
}

export function ErrorState({ title = "Konten belum dapat dimuat" }: { title?: string }) {
  return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center"><h2 className="font-extrabold text-rose-900">{title}</h2><p className="mt-2 text-sm text-rose-700">Periksa koneksi Anda atau coba muat ulang halaman ini beberapa saat lagi.</p></div>;
}

export function NotFoundState({ title = "Konten tidak ditemukan", description = "Konten yang Anda cari mungkin sudah dipindahkan atau belum diterbitkan." }: { title?: string; description?: string }) {
  return <div className="portal-card px-6 py-16 text-center"><h1 className="text-xl font-extrabold text-slate-900">{title}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p></div>;
}

export function ComingSoonState({ title, description }: { title: string; description: string }) {
  return <div className="portal-card px-6 py-16 text-center" data-feature-state="coming-soon"><span className="portal-badge mx-auto">Segera</span><span className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500" aria-hidden="true"><PortalIcon name="sparkles" className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-extrabold text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p></div>;
}

export function ButtonIcon({ href, children, label }: { href: string; children: React.ReactNode; label: string }) {
  return <Link href={href} className="portal-button-icon inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-primary hover:bg-primary hover:text-white transition-colors" aria-label={label}>{children}</Link>;
}

export function Tag({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="portal-tag inline-block px-3 py-1 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-primary hover:text-white transition-colors">{children}</Link>;
}

function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [];
  const start = Math.max(1, current - 1);
  const end = Math.min(total, current + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (end < total) {
    if (end < total - 1) pages.push("ellipsis");
    pages.push(total);
  }

  return pages;
}

export function Pagination({
  pagination,
  path,
  getHref,
  label = "Paginasi",
  className = "",
}: {
  pagination?: PaginationData;
  path: string;
  getHref?: (page: number) => string;
  label?: string;
  className?: string;
}) {
  if (!pagination || pagination.total_pages <= 1) return null;
  const previous = Math.max(1, pagination.page - 1);
  const next = Math.min(pagination.total_pages, pagination.page + 1);
  const href = getHref ?? ((page: number) => {
    const glue = path.includes("?") ? "&" : "?";
    return `${path}${glue}page=${page}`;
  });

  const pageRange = getPageRange(pagination.page, pagination.total_pages);

  return (
    <div className={cx("grid md:grid-cols-12 grid-cols-1 mt-10", className)}>
      <div className="md:col-span-12 text-center">
        <nav aria-label={label}>
          <ul className="inline-flex items-center -space-x-px text-sm">
            <li>
              <Link
                href={href(previous)}
                aria-disabled={pagination.page <= 1}
                tabIndex={pagination.page <= 1 ? -1 : undefined}
                className={cx(
                  "size-10 inline-flex justify-center items-center text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111a2e] rounded-s-lg border border-slate-200 dark:border-slate-800 transition-all duration-300",
                  pagination.page <= 1
                    ? "pointer-events-none opacity-40"
                    : "hover:text-white hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary"
                )}
                aria-label="Halaman sebelumnya"
              >
                <PortalIcon name="chevron-left" className="h-4 w-4" />
              </Link>
            </li>

            {pageRange.map((item, idx) => {
              if (item === "ellipsis") {
                return (
                  <li key={`ellipsis-${idx}`}>
                    <span className="size-10 inline-flex justify-center items-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 select-none">
                      …
                    </span>
                  </li>
                );
              }

              const isCurrent = item === pagination.page;
              return (
                <li key={item}>
                  <Link
                    href={href(item)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cx(
                      "size-10 inline-flex justify-center items-center font-bold transition-all duration-300 border",
                      isCurrent
                        ? "z-10 text-white bg-primary border-primary shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:text-white bg-white dark:bg-[#111a2e] border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary"
                    )}
                  >
                    {item}
                  </Link>
                </li>
              );
            })}

            <li>
              <Link
                href={href(next)}
                aria-disabled={pagination.page >= pagination.total_pages}
                tabIndex={pagination.page >= pagination.total_pages ? -1 : undefined}
                className={cx(
                  "size-10 inline-flex justify-center items-center text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111a2e] rounded-e-lg border border-slate-200 dark:border-slate-800 transition-all duration-300",
                  pagination.page >= pagination.total_pages
                    ? "pointer-events-none opacity-40"
                    : "hover:text-white hover:border-primary dark:hover:border-primary hover:bg-primary dark:hover:bg-primary"
                )}
                aria-label="Halaman berikutnya"
              >
                <PortalIcon name="chevron-right" className="h-4 w-4" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function formatDate(value?: string | null, options?: { time?: boolean }) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", ...(options?.time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function TechwindCourseCard({
  href,
  image,
  category,
  title,
  summary,
  instructorName = "Tim Pengajar",
  instructorAvatar = "/techwind-hero/client/01.jpg",
  materialCount = 12,
  duration = "6 jam",
  views = "1.2k",
  badge = "Gratis",
  progress,
  completed,
}: {
  href: string;
  image: string;
  category: string;
  title: string;
  summary: string;
  instructorName?: string;
  instructorAvatar?: string;
  materialCount?: number;
  duration?: string;
  views?: string;
  badge?: string;
  progress?: number;
  completed?: boolean;
}) {
  const isDone = Boolean(completed || (progress !== undefined && progress >= 100));
  return (
    <div className="group relative rounded-2xl shadow-sm hover:shadow-xl dark:shadow-gray-900/50 hover:-translate-y-1.5 duration-500 ease-in-out overflow-hidden bg-white dark:bg-[#111a2e] border border-slate-200/80 dark:border-slate-800 transition-all">
      <div className="relative overflow-hidden aspect-[16/10]">
        <img
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 duration-500 ease-in-out"
          src={image}
        />
        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 duration-500 ease-in-out" />
        {isDone ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md inline-flex items-center gap-1">
              <span>✓</span> Selesai
            </span>
          </div>
        ) : progress !== undefined && progress > 0 ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md inline-flex items-center gap-1">
              <span>●</span> {progress}%
            </span>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 duration-500 ease-in-out">
          <div className="pb-4 px-4 flex items-center">
            <img
              alt={instructorName}
              className="size-10 rounded-full shadow-md dark:shadow-gray-800 object-cover"
              src={instructorAvatar}
            />
            <div className="ms-3">
              <span className="font-semibold text-white block text-sm">{instructorName}</span>
              <span className="text-white/70 text-xs">Instruktur</span>
            </div>
          </div>
        </div>
      </div>
      <div className="content p-6 relative">
        <span className="font-medium block text-primary text-xs uppercase tracking-wider">{category}</span>
        <Link
          className="text-lg font-bold block text-slate-900 dark:text-white hover:text-primary duration-500 ease-in-out mt-2 line-clamp-2"
          href={href}
        >
          {title}
        </Link>
        <p className="text-slate-600 dark:text-slate-300 mt-3 mb-4 text-sm line-clamp-2 leading-relaxed">
          {summary}
        </p>
        {(progress !== undefined || completed) && (
          <div className="mb-4 pt-2">
            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Progres Belajar</span>
              <span className={isDone ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-teal-600 dark:text-teal-400 font-bold"}>
                {isDone ? "100%" : `${progress ?? 0}%`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-teal-500"}`}
                style={{ width: `${isDone ? 100 : Math.min(100, Math.max(0, progress ?? 0))}%` }}
              />
            </div>
          </div>
        )}
        <ul className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center list-none text-slate-500 dark:text-slate-400 text-xs font-medium">
          <li className="flex items-center me-4">
            <svg className="size-4 leading-none me-1.5 text-slate-900 dark:text-white inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{materialCount} Materi</span>
          </li>
          <li className="flex items-center me-4">
            <svg className="size-4 leading-none me-1.5 text-slate-900 dark:text-white inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{duration}</span>
          </li>
          <li className="flex items-center">
            <svg className="size-4 leading-none me-1.5 text-slate-900 dark:text-white inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{views}</span>
          </li>
        </ul>
        {badge ? (
          <div className="absolute -top-7 right-6 z-10 opacity-0 group-hover:opacity-100 duration-500 ease-in-out">
            <div className="flex justify-center items-center size-14 bg-white dark:bg-[#111a2e] rounded-full shadow-lg dark:shadow-gray-900/50 text-primary dark:text-white border border-slate-200/60 dark:border-slate-700">
              <span className="font-bold text-xs">{badge}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TechwindPortfolioCard({
  href,
  image,
  title,
  subtitle = "Pengumuman",
  aspect = "aspect-[4/3]",
}: {
  href: string;
  image: string;
  title: string;
  subtitle?: string;
  aspect?: string;
}) {
  return (
    <div className="group relative block overflow-hidden rounded-2xl duration-500 bg-white dark:bg-[#111a2e] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl dark:shadow-gray-900/50 hover:-translate-y-1.5 transition-all">
      <Link className="duration-500 group-hover:scale-105 block overflow-hidden" href={href}>
        <img alt={title} className={cx(aspect, "w-full object-cover")} src={image} />
      </Link>
      <div className="absolute -bottom-52 group-hover:bottom-2 inset-x-2 duration-500 bg-white dark:bg-[#111a2e] p-4 rounded-xl shadow-md dark:shadow-gray-900/50 border border-slate-200/80 dark:border-slate-800 transition-all">
        <Link className="hover:text-primary text-base font-bold duration-500 block truncate text-slate-900 dark:text-white" href={href}>
          {title}
        </Link>
        <span className="text-slate-500 dark:text-slate-400 text-xs mt-1 block font-medium">{subtitle}</span>
      </div>
    </div>
  );
}

export function TechwindHorizontalNewsCard({
  href,
  image,
  title,
  summary,
}: {
  href: string;
  image: string;
  title: string;
  summary: string;
}) {
  return (
    <div className="blog group relative rounded-2xl shadow-sm hover:shadow-xl dark:shadow-gray-900/50 hover:-translate-y-1.5 overflow-hidden bg-white dark:bg-[#111a2e] border border-slate-200/80 dark:border-slate-800 duration-500 transition-all">
      <div className="lg:flex relative">
        <div className="relative md:shrink-0 overflow-hidden">
          <img
            alt={title}
            className="h-48 w-full object-cover lg:w-52 lg:h-56 group-hover:scale-105 duration-500"
            src={image}
          />
        </div>
        <div className="p-6 flex flex-col lg:h-56 justify-center flex-1">
          <Link
            className="title h5 text-lg font-bold text-slate-900 dark:text-white hover:text-primary duration-500 ease-in-out line-clamp-2"
            href={href}
          >
            {title}
          </Link>
          <p className="text-slate-600 dark:text-slate-300 mt-3 text-sm line-clamp-2 leading-relaxed">
            {summary}
          </p>
          <div className="mt-4">
            <Link
              className="relative inline-flex items-center gap-1 text-sm font-bold tracking-wide text-primary hover:text-primary-700 group-hover:translate-x-1.5 duration-500 transition-transform"
              href={href}
            >
              <span>Baca Selengkapnya</span>
              <svg className="size-4 inline-block ms-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
