import Link from "next/link";

import { NotFoundState } from "@/components/techwind";

export default function KnowledgeTopicNotFound() {
  return <section className="portal-container py-16"><NotFoundState title="Topik tidak ditemukan" description="Topik mungkin belum tersedia atau alamatnya tidak valid." /><div className="mt-5 text-center"><Link href="/knowledge" className="portal-button-primary">Jelajahi Pusat Pengetahuan</Link></div></section>;
}
