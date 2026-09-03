import type { Metadata } from "next";

import { ComingSoonState, PageHero } from "@/components/techwind";

export const metadata: Metadata = { title: "Webinar", description: "Informasi Webinar Teman Belajar akan tersedia setelah fitur diaktifkan.", robots: { index: false, follow: false } };

export default function WebinarsPage() {
  return (
    <div>
      <PageHero eyebrow="Pembelajaran" title="Webinar bersama narasumber" description="Ruang untuk sesi belajar langsung bersama narasumber. Fitur ini belum diaktifkan." />
      <section className="portal-container py-10 sm:py-14">
        <ComingSoonState title="Webinar masih dalam persiapan" description="Webinar akan tersedia setelah keputusan provider, kontrak akses, dan seluruh acceptance gate selesai. Belum ada data atau tindakan Webinar yang aktif." />
      </section>
    </div>
  );
}
