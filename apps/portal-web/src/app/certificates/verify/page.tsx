import type { Metadata } from "next";
import { FullScreenHero } from "@/components/techwind";
import { CertificateVerifyView } from "@/components/certificates/certificate-verify-view";
import { verifyCertificate } from "@/lib/certificates";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const code = (params.code || "").trim();

  return {
    title: code ? `Verifikasi Sertifikat: ${code}` : "Verifikasi Sertifikat Resmi",
    description:
      "Cek dan verifikasi keaslian sertifikat kelulusan Teman Belajar secara online dan instan melalui kode sertifikat resmi.",
    alternates: { canonical: "/certificates/verify" },
    robots: { index: !code, follow: true },
  };
}

export default async function CertificateVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code || "").trim();

  const initialResult = code ? await verifyCertificate(code) : null;

  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Verifikasi Sertifikat" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/40">
      <div className="print:hidden">
        <FullScreenHero
          title="Verifikasi Sertifikat Resmi"
          description="Validasi keabsahan kredensial kompetensi dan sertifikat kelulusan yang diterbitkan secara resmi oleh platform Teman Belajar."
          align="center"
          variant="listing"
          breadcrumbs={breadcrumbs}
        />
      </div>

      <section className="relative md:py-20 py-12 print:py-4 print:bg-transparent">
        <div className="container mx-auto px-4 max-w-3xl">
          <CertificateVerifyView
            initialCode={code}
            initialResult={initialResult}
          />
        </div>
      </section>
    </div>
  );
}
