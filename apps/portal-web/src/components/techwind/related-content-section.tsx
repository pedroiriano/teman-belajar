import Link from "next/link";
import type { ReactNode } from "react";

export type RelatedContentSectionProps = {
  eyebrow?: string;
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
};

export function RelatedContentSection({
  eyebrow = "Rekomendasi Terkait",
  title = "Materi Terkait Lainnya",
  viewAllHref,
  viewAllLabel = "Lihat Semua →",
  children,
  className = "",
}: RelatedContentSectionProps) {
  return (
    <section
      className={`portal-container pt-12 pb-16 border-t border-gray-100 dark:border-gray-800 ${className}`}
      aria-label={title}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <p className="portal-eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
