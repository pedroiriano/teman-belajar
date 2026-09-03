import { Breadcrumb, NotFoundState } from "@/components/techwind";

export default function MicrolearningNotFound() {
  return <div><Breadcrumb items={[{ href: "/", label: "Beranda" }, { href: "/microlearning", label: "Pembelajaran Singkat" }, { label: "Tidak ditemukan" }]} /><div className="portal-container py-12"><NotFoundState title="Materi pembelajaran tidak ditemukan" description="Materi mungkin belum diterbitkan, sudah diarsipkan, atau alamatnya tidak valid." /></div></div>;
}
