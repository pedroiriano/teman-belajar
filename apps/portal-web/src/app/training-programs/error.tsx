"use client";
import { ErrorState } from "@/components/techwind";

export default function TrainingProgramsError({reset}:{reset:()=>void}){return <div className="portal-container py-20"><ErrorState title="Program pelatihan belum dapat ditampilkan" /><div className="text-center"><button type="button" onClick={reset} className="portal-button-secondary mt-5">Coba lagi</button></div></div>}
