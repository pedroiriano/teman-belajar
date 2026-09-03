import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComingSoonState, PageHero } from "@/components/techwind";

export const metadata: Metadata = { title: "Detail Webinar", robots: { index: false, follow: false } };

export default async function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawID } = await params;
  if (!/^[1-9][0-9]*$/.test(rawID)) notFound();

  return (
    <div>
      <PageHero eyebrow="Pembelajaran" title="Detail Webinar" description="Halaman detail Webinar akan tersedia setelah fitur diaktifkan." />
      <section className="portal-container py-10 sm:py-14">
        <ComingSoonState title={`Webinar #${rawID} masih dalam persiapan`} description="Belum ada data atau tindakan Webinar yang aktif sampai seluruh acceptance gate selesai." />
        <div className="mt-6 text-center"><Link href="/webinars" className="portal-button-secondary">Kembali ke Webinar</Link></div>
      </section>
    </div>
  );
}
