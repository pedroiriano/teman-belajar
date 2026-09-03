import { NotFoundState } from "@/components/techwind";

export default function TrainingProgramNotFound() {
  return <div className="portal-container py-20"><NotFoundState title="Program pelatihan tidak ditemukan" description="Program mungkin belum diterbitkan, sudah diarsipkan, atau alamatnya tidak valid." /></div>;
}
