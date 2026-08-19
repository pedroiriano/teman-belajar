import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { AdminSignIn } from "@/components/admin-sign-in";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#111827] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_20%,#f97316_0,transparent_28%),radial-gradient(circle_at_85%_80%,#3b82f6_0,transparent_26%)]"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 font-black">TB</span>
          <div>
            <p className="font-extrabold">Teman Belajar</p>
            <p className="text-xs uppercase tracking-[.18em] text-slate-400">Admin Console</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-orange-300">Editorial workspace</p>
          <h1 className="mt-5 text-5xl font-black leading-tight">
            Kelola pengetahuan yang menggerakkan organisasi.
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-300">
            Satu tempat yang aman untuk menyusun, meninjau, menyetujui, dan menerbitkan konten Teman Belajar.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">Enterprise Digital Learning Experience Platform</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-6">
        <div className="admin-card w-full max-w-md p-7 sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 font-black text-orange-700 lg:hidden">TB</span>
          <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-orange-600">Akses terproteksi</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">Masuk ke Admin Console</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Gunakan akun organisasi Anda. Hak akses Editor, Reviewer, atau Portal Administrator diperlukan.
          </p>
          <AdminSignIn />
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Sesi dikelola secara aman melalui cookie HttpOnly.
          </p>
        </div>
      </section>
    </div>
  );
}
