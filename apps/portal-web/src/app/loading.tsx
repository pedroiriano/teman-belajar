export default function Loading() {
  return <div className="portal-container py-16" role="status" aria-live="polite"><span className="sr-only">Memuat konten</span><div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-200"/><div className="mt-5 h-5 w-1/2 animate-pulse rounded bg-slate-200"/><div className="mt-12 grid gap-6 md:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-200"/>)}</div></div>;
}
