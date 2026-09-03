"use client";

import { ErrorState } from "@/components/techwind";

export default function KnowledgeError({ reset }: { reset: () => void }) {
  return <section className="portal-container py-16"><ErrorState title="Pusat Pengetahuan belum dapat dimuat" /><div className="mt-5 text-center"><button type="button" onClick={reset} className="portal-button-primary">Coba lagi</button></div></section>;
}
