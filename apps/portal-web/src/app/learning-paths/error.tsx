"use client";

import { ErrorState } from "@/components/techwind";

export default function LearningPathsError({ reset }: { reset: () => void }) {
  return <div className="portal-container py-16"><ErrorState title="Jalur Belajar belum dapat dimuat" /><button type="button" onClick={reset} className="portal-button-primary mt-6">Coba lagi</button></div>;
}
