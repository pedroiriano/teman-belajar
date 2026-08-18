import Link from "next/link";

import { AdminIcon } from "@/components/admin-icon";

export function AdminUnauthorized({ resource }: { resource: string }) {
  return <section className="admin-card mx-auto max-w-xl p-8 text-center" role="alert"><span className="admin-stat-icon mx-auto !h-14 !w-14"><AdminIcon name="users" className="h-6 w-6" /></span><p className="admin-kicker mt-5">Akses dibatasi</p><h1 className="mt-2 text-2xl font-black text-slate-900">Anda tidak dapat mengelola {resource}</h1><p className="mt-3 text-sm leading-6 text-slate-500">Role Portal Administrator, Content Editor, atau Reviewer diperlukan untuk membuka modul ini.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/dashboard" className="admin-button-secondary">Kembali ke dashboard</Link><Link href="/api/auth/federated-logout" prefetch={false} className="admin-button">Ganti akun</Link></div></section>;
}
