import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan (404)",
  description: "Halaman yang Anda tuju tidak ditemukan atau telah dipindahkan.",
  robots: { index: false, follow: true },
};

export default function RootNotFound() {
  return (
    <section className="relative py-20 lg:py-28 bg-primary/5 dark:bg-slate-900/40 flex items-center justify-center min-h-[calc(100vh-14rem)]">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1">
          <div className="title-heading text-center max-w-xl mx-auto my-auto">
            <div className="relative mb-6">
              <Image
                src="/techwind/error.png"
                alt="404 Halaman Tidak Ditemukan"
                width={360}
                height={270}
                className="mx-auto max-w-[280px] sm:max-w-[340px] h-auto drop-shadow-sm"
                priority
              />
            </div>
            <h1 className="mt-4 mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
              Halaman Tidak Ditemukan?
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              Mohon maaf, halaman yang Anda tuju tidak dapat ditemukan, telah dipindahkan, atau tautan yang dimasukkan keliru.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-primary hover:bg-primary-700 border-primary hover:border-primary-700 text-white rounded-md shadow-md transition-all"
              >
                Kembali ke Beranda
              </Link>
              <Link
                href="/search"
                className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-primary rounded-md transition-all shadow-sm"
              >
                Pencarian Terpadu
              </Link>
              <Link
                href="/help"
                className="py-2.5 px-6 inline-block font-semibold tracking-wide border align-middle duration-500 text-sm sm:text-base text-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-primary rounded-md transition-all shadow-sm"
              >
                Pusat Bantuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
