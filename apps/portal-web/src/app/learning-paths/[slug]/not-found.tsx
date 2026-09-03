import { Breadcrumb, NotFoundState } from "@/components/techwind";

export default function LearningPathNotFound() {
  return <div><Breadcrumb items={[{ href: "/", label: "Beranda" }, { href: "/learning-paths", label: "Jalur Belajar" }, { label: "Tidak ditemukan" }]} /><div className="portal-container py-12"><NotFoundState title="Jalur belajar tidak ditemukan" description="Jalur mungkin belum diterbitkan, sudah diarsipkan, atau alamatnya tidak valid." /></div></div>;
}
