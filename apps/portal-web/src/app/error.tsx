"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="portal-container py-20 text-center" role="alert"><div className="portal-card mx-auto max-w-xl p-10"><p className="portal-eyebrow">Terjadi kendala</p><h1 className="mt-3 text-2xl font-black">Halaman belum dapat ditampilkan</h1><p className="mt-3 text-sm leading-6 text-slate-500">Kami tidak dapat memuat konten saat ini. Silakan coba kembali.</p><button onClick={reset} className="portal-button-primary mt-6">Coba lagi</button></div></div>;
}
