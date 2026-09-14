import Link from "next/link";
import type { HTMLAttributes } from "react";

export interface CategoryItem {
  id: string;
  title: string;
  lessonCount: number | string;
  href: string;
  iconName: string;
}

const defaultCategories: CategoryItem[] = [
  {
    id: "tech",
    title: "Teknologi & Pemrograman",
    lessonCount: "18 Pelajaran",
    href: "/catalog?category=teknologi",
    iconName: "ri-code-s-slash-line",
  },
  {
    id: "data",
    title: "Sains Data & AI",
    lessonCount: "14 Pelajaran",
    href: "/catalog?category=data",
    iconName: "ri-pie-chart-line",
  },
  {
    id: "security",
    title: "Keamanan Siber",
    lessonCount: "10 Pelajaran",
    href: "/catalog?category=keamanan",
    iconName: "ri-shield-check-line",
  },
  {
    id: "leadership",
    title: "Kepemimpinan Strategis",
    lessonCount: "16 Pelajaran",
    href: "/catalog?category=kepemimpinan",
    iconName: "ri-award-line",
  },
  {
    id: "marketing",
    title: "Komunikasi & Pemasaran",
    lessonCount: "12 Pelajaran",
    href: "/catalog?category=komunikasi",
    iconName: "ri-megaphone-line",
  },
  {
    id: "collaboration",
    title: "Kolaborasi & Produktivitas",
    lessonCount: "15 Pelajaran",
    href: "/catalog?category=kolaborasi",
    iconName: "ri-team-line",
  },
];

interface BrowseCategoriesSectionProps extends HTMLAttributes<HTMLElement> {
  categories?: CategoryItem[];
}

export function BrowseCategoriesSection({
  categories = defaultCategories,
  ...props
}: BrowseCategoriesSectionProps) {
  return (
    <section
      {...props}
      data-techwind-pattern="browse-course-categories"
      id="kategori-pilihan"
      className="relative md:py-24 py-16 bg-gray-50 dark:bg-slate-800"
    >
      <div className="container relative">
        <div className="grid md:grid-cols-12 grid-cols-1 pb-8 items-end">
          <div className="lg:col-span-8 md:col-span-6 md:text-start text-center">
            <span className="text-primary text-sm font-bold uppercase tracking-wider block mb-2">
              Kategori Pilihan
            </span>
            <h2 className="mb-4 md:text-3xl md:leading-normal text-2xl leading-normal font-bold text-slate-900 dark:text-white">
              Telusuri Kategori Pelatihan
            </h2>
            <p className="text-slate-400 max-w-xl text-base">
              Eksplorasi beragam rumpun ilmu dan keahlian untuk akselerasi karier dan pengembangan kompetensi Anda.
            </p>
          </div>

          <div className="lg:col-span-4 md:col-span-6 md:text-end hidden md:block">
            <Link
              href="/catalog"
              className="relative inline-flex items-center gap-1.5 font-semibold tracking-wide text-base text-slate-400 hover:text-primary duration-500 ease-in-out group"
            >
              <span>Semua Kategori</span>
              <svg
                className="size-4 inline-block transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 mt-8 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="px-3 py-8 rounded-xl shadow-sm dark:shadow-gray-800 group text-center bg-white dark:bg-slate-900 hover:bg-primary/5 dark:hover:bg-primary/5 hover:-translate-y-1.5 duration-500 border border-slate-100 dark:border-slate-800 transition-all flex flex-col items-center justify-center"
            >
              <div className="size-18 bg-primary/5 group-hover:bg-primary text-primary group-hover:text-white rounded-full text-2xl flex items-center justify-center shadow-xs dark:shadow-gray-800 duration-500 mx-auto transition-colors">
                <i className={`${cat.iconName} leading-none`} />
              </div>

              <div className="content mt-5 w-full px-2">
                <Link
                  href={cat.href}
                  className="title text-base font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary duration-300 line-clamp-2 block"
                >
                  {cat.title}
                </Link>
                <p className="text-slate-400 text-xs mt-2 font-medium">
                  {cat.lessonCount}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-12 grid-cols-1 md:hidden mt-8">
          <div className="md:col-span-12 text-center">
            <Link
              href="/catalog"
              className="py-2.5 px-6 inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide border align-middle duration-500 text-sm text-center bg-transparent hover:bg-primary border-primary text-primary hover:text-white rounded-md transition-all shadow-sm"
            >
              <span>Lihat Semua Kategori</span>
              <svg
                className="size-4 inline-block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
