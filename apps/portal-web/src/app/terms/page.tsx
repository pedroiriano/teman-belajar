import type { Metadata } from "next";
import Link from "next/link";
import { FullScreenHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description: "Pedoman hak, kewajiban, integritas akademik, dan tata tertib penggunaan platform Teman Belajar.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Syarat & Ketentuan" },
  ];

  const sections = [
    { id: "ketentuan-umum", title: "1. Ketentuan Umum dan Akun" },
    { id: "kode-etik", title: "2. Kode Etik dan Integritas Belajar" },
    { id: "hak-cipta", title: "3. Hak Kekayaan Intelektual" },
    { id: "sertifikasi", title: "4. Penerbitan dan Verifikasi Sertifikat" },
    { id: "ketersediaan", title: "5. Ketersediaan Layanan dan Batasan" },
    { id: "penyelesaian-perselisihan", title: "6. Perubahan dan Perselisihan" },
  ];

  return (
    <>
      <FullScreenHero
        title="Syarat & Ketentuan Layanan"
        description="Aturan dan pedoman penggunaan fasilitas pembelajaran digital Teman Belajar demi terciptanya ekosistem belajar yang berintegritas dan produktif."
        backgroundImage="/techwind-hero/utility.jpg"
        align="center"
        variant="listing"
        breadcrumbs={breadcrumbs}
      />

      <section className="portal-container py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 self-start lg:sticky lg:top-24">
            <div className="portal-card p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                Daftar Isi Ketentuan
              </h3>
              <nav aria-label="Navigasi Syarat dan Ketentuan">
                <ul className="space-y-2 text-sm">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors block py-1 font-medium"
                      >
                        {sec.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <span>Berlaku Efektif: 14 September 2026</span>
              </div>
            </div>
          </aside>

          {/* Main Editorial Content */}
          <div className="lg:col-span-8 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
            <div id="ketentuan-umum" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                1. Ketentuan Umum dan Akun
              </h2>
              <p>
                Dengan mengakses dan menggunakan platform <strong>Teman Belajar</strong>, Anda menyatakan telah membaca, memahami,
                dan menyetujui untuk terikat oleh seluruh Syarat dan Ketentuan ini. Layanan ini diperuntukkan bagi seluruh pegawai,
                pembelajar resmi, dan mitra organisasi terdaftar.
              </p>
              <p className="mt-3">
                Pengguna bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun (*username* dan kata sandi), serta segala aktivitas
                yang dilakukan melalui akun bersangkutan. Dilarang keras memindahtangankan, meminjamkan, atau menyalahgunakan akun pembelajaran kepada pihak lain.
              </p>
            </div>

            <div id="kode-etik" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                2. Kode Etik dan Integritas Belajar
              </h2>
              <p>
                Setiap pembelajar diwajibkan menjunjung tinggi prinsip kejujuran akademik dan etika profesional:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Mengerjakan kuis, ujian kompetensi, dan tugas evaluasi secara mandiri tanpa bantuan pihak ketiga yang tidak sah atau otomasi yang dilarang.</li>
                <li>Tidak menyebarluaskan kunci jawaban, soal ujian, atau bank soal ke media sosial atau forum publik di luar platform.</li>
                <li>Berinteraksi secara santun, inklusif, dan konstruktif dalam fitur ulasan, diskusi kelas, atau forum tanya-jawab.</li>
                <li>Tidak mengunggah konten yang mengandung unsur pelecehan, diskriminasi, ujaran kebencian, malware, atau materi yang melanggar hukum.</li>
              </ul>
            </div>

            <div id="hak-cipta" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                3. Hak Kekayaan Intelektual
              </h2>
              <p>
                Seluruh materi pembelajaran, kurikulum, video, modul baca, ilustrasi grafis, dokumen panduan, dan kode perangkat lunak yang ada di Teman Belajar
                merupakan hak kekayaan intelektual organisasi atau penyedia materi resmi yang dilindungi oleh undang-undang hak cipta.
              </p>
              <p className="mt-3">
                Pembelajar hanya diberikan lisensi terbatas, non-eksklusif, dan tidak dapat dialihkan untuk mempelajari materi demi keperluan peningkatan kompetensi pribadi.
                Dilarang memperbanyak, mendistribusikan ulang, atau mengomersialkan materi tanpa izin tertulis dari pemegang hak cipta.
              </p>
            </div>

            <div id="sertifikasi" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                4. Penerbitan dan Verifikasi Sertifikat
              </h2>
              <p>
                Sertifikat kelulusan resmi hanya diterbitkan bagi pembelajar yang telah menyelesaikan seluruh tahapan, durasi, dan kriteria kelulusan minimum
                pada kursus formal yang dikelola melalui Moodle LMS. Setiap sertifikat dilengkapi kode identifikasi unik (*certificate code*) yang dapat
                diverifikasi keasliannya melalui layanan publik kami di <Link href="/certificates/verify" className="text-primary font-bold hover:underline">/certificates/verify</Link>.
              </p>
              <p className="mt-3">
                Pemalsuan, manipulasi, atau klaim tidak sah atas sertifikat kelulusan merupakan pelanggaran berat terhadap tata tertib organisasi dan akan dikenakan sanksi kedinasan yang berlaku.
              </p>
            </div>

            <div id="ketersediaan" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                5. Ketersediaan Layanan dan Batasan
              </h2>
              <p>
                Pengelola senantiasa berupaya menjaga ketersediaan sistem dan reliabilitas layanan secara optimal. Namun, kami berhak melakukan pemeliharaan berkala
                (*scheduled maintenance*), pembaruan sistem, atau tindakan perlindungan darurat yang dapat menyebabkan jeda operasional sementara.
              </p>
            </div>

            <div id="penyelesaian-perselisihan" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                6. Perubahan dan Perselisihan
              </h2>
              <p>
                Pengelola berhak memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Pembaruan akan diumumkan melalui platform dan berlaku sejak tanggal ditetapkan.
                Segala perselisihan yang timbul sehubungan dengan penggunaan layanan ini akan diselesaikan secara musyawarah untuk mufakat sesuai koridor hukum Republik Indonesia.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
