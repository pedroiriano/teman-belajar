import Link from "next/link";

import { NotFoundState } from "@/components/techwind";

export default function KnowledgeArticleNotFound() {
  return <section className="portal-container py-16"><NotFoundState title="Artikel tidak ditemukan" description="Artikel mungkin belum diterbitkan atau alamatnya tidak valid." /><div className="mt-5 text-center"><Link href="/knowledge" className="portal-button-primary">Kembali ke Pusat Pengetahuan</Link></div></section>;
}
