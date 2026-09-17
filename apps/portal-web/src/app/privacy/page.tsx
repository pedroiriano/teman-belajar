import type { Metadata } from "next";
import Link from "next/link";
import { FullScreenHero } from "@/components/techwind";
import { PortalIcon } from "@/components/portal-icon";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Transparansi dan tata kelola perlindungan data pribadi dalam ekosistem pembelajaran Teman Belajar sesuai UU PDP.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const breadcrumbs = [
    { href: "/", label: "Beranda" },
    { label: "Kebijakan Privasi" },
  ];

  const sections = [
    { id: "landasan-hukum", title: "1. Landasan Hukum dan Prinsip" },
    { id: "data-dikumpulkan", title: "2. Data Pribadi yang Dikelola" },
    { id: "tujuan-pemrosesan", title: "3. Tujuan Pemrosesan Data" },
    { id: "keamanan-penyimpanan", title: "4. Keamanan dan Penyimpanan Data" },
    { id: "hak-pemilik-data", title: "5. Hak Pemilik Data Pribadi" },
    { id: "kontak-dpo", title: "6. Kontak Pejabat Pelindungan Data" },
  ];

  return (
    <>
      <FullScreenHero
        title="Kebijakan Privasi"
        description="Komitmen kami dalam melindungi kerahasiaan, integritas, dan keamanan data pribadi pembelajar dalam ekosistem Teman Belajar."
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
                Daftar Isi Kebijakan
              </h3>
              <nav aria-label="Navigasi Kebijakan Privasi">
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
                <span>Pembaruan Terakhir: 14 September 2026</span>
              </div>
            </div>
          </aside>

          {/* Main Editorial Content */}
          <div className="lg:col-span-8 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
            <div id="landasan-hukum" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                1. Landasan Hukum dan Prinsip
              </h2>
              <p>
                Teman Belajar berkomitmen penuh melindungi hak privasi setiap pembelajar, instruktur, dan administrator.
                Pengelolaan dan pemrosesan data pribadi pada platform ini tunduk pada ketentuan{" "}
                <strong>Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>, standar keamanan
                informasi ISO/IEC 27001, serta peraturan perundang-undangan terkait tata kelola sistem pemerintahan berbasis elektronik (SPBE).
              </p>
              <p className="mt-3">
                Kami menerapkan prinsip keterbatasan tujuan, keabsahan pemrosesan, akurasi, transparansi, pembatasan penyimpanan,
                serta integritas dan kerahasiaan data dalam setiap siklus operasional pembelajaran.
              </p>
            </div>

            <div id="data-dikumpulkan" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                2. Data Pribadi yang Dikelola
              </h2>
              <p>
                Data yang diproses dalam ekosistem Teman Belajar mencakup kategori berikut:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>
                  <strong>Data Identitas Akun:</strong> Nama lengkap, alamat surel resmi, nama pengguna (*username*), unit kerja,
                  dan peran pengguna yang disinkronkan secara aman melalui identitas terpusat (Keycloak SSO).
                </li>
                <li>
                  <strong>Data Riwayat dan Aktivitas Belajar:</strong> Pendaftaran kursus, modul yang dipelajari, riwayat penayangan materi,
                  penilaian tugas/kuis, catatan waktu belajar, dan progres kelulusan pada Moodle LMS.
                </li>
                <li>
                  <strong>Data Kredensial dan Capaian:</strong> Sertifikat kelulusan digital resmi, kode verifikasi sertifikat,
                  serta transkrip capaian kompetensi pembelajar.
                </li>
                <li>
                  <strong>Data Teknis dan Log Sistem:</strong> Alamat IP, jenis peramban (*browser*), serta jejak audit keamanan
                  yang dicatat untuk pencegahan insiden keamanan siber.
                </li>
              </ul>
            </div>

            <div id="tujuan-pemrosesan" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                3. Tujuan Pemrosesan Data
              </h2>
              <p>
                Data pribadi yang dikumpulkan hanya digunakan untuk kepentingan sah pengembangan kompetensi dan operasional platform:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Menyediakan akses otentikasi tunggal (*Single Sign-On*) ke seluruh layanan pembelajaran.</li>
                <li>Memantau dan mencatat kemajuan belajar individu serta memberikan rekomendasi materi yang relevan.</li>
                <li>Menerbitkan dan memvalidasi sertifikat kelulusan serta transkrip akademik secara sah.</li>
                <li>Menyusun laporan agregat kompetensi untuk pimpinan organisasi tanpa membuka data sensitif individu.</li>
                <li>Menjaga integritas, keandalan sistem, dan audit jejak keamanan operasional.</li>
              </ul>
            </div>

            <div id="keamanan-penyimpanan" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                4. Keamanan dan Penyimpanan Data
              </h2>
              <p>
                Teman Belajar menerapkan langkah-langkah teknis dan organisasional mutakhir untuk mengamankan data pribadi:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Enkripsi data saat transit menggunakan protokol TLS 1.3 terkini.</li>
                <li>Pemisahan basis data pengalaman portal dan basis data pembelajaran formal Moodle.</li>
                <li>Kontrol akses berbasis peran ketat (*Role-Based Access Control / RBAC*) dengan otorisasi di sisi peladen (*server-side*).</li>
                <li>Penyimpanan media dan berkas terenkripsi pada infrastruktur *Object Storage* privat.</li>
              </ul>
            </div>

            <div id="hak-pemilik-data" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                5. Hak Pemilik Data Pribadi
              </h2>
              <p>
                Sesuai dengan peraturan perundang-undangan yang berlaku, setiap pembelajar memiliki hak:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Mendapatkan kejelasan mengenai perlakuan dan tujuan pemrosesan data pribadinya.</li>
                <li>Mengakses dan memperoleh salinan data transkrip pembelajaran melalui halaman profil akun.</li>
                <li>Memperbaiki ketidakakuratan data profil melalui administrator identitas organisasi.</li>
                <li>Mengajukan keberatan atau pengaduan atas dugaan ketidaksesuaian pemrosesan data.</li>
              </ul>
            </div>

            <div id="kontak-dpo" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">
                6. Kontak Pejabat Pelindungan Data
              </h2>
              <p>
                Apabila Anda memiliki pertanyaan, saran, atau memerlukan klarifikasi lebih lanjut mengenai pemrosesan data pribadi Anda di Teman Belajar, silakan menghubungi:
              </p>
              <div className="mt-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">Tim Tata Kelola dan Kepatuhan Data — Teman Belajar</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Surel: dpo@teman-belajar.local</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Layanan Bantuan: Melalui menu Pusat Bantuan atau FAQ Platform</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
