"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WebinarActions({ id, registered, cancellationAllowed, disabled }: { id: number; registered: boolean; cancellationAllowed: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function mutate(method: "POST" | "DELETE") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/webinars/${id}/registration`, {
        method,
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        setMessage(problem?.detail || "Perubahan registrasi belum dapat diproses.");
        return;
      }
      setMessage(method === "POST" ? "Registrasi berhasil." : "Registrasi dibatalkan.");
      router.refresh();
    } catch {
      setMessage("Layanan webinar sementara tidak dapat dijangkau.");
    } finally {
      setPending(false);
    }
  }

  return <div>
    {registered ? <button type="button" disabled={pending || !cancellationAllowed} onClick={() => mutate("DELETE")} className="portal-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Memproses…" : cancellationAllowed ? "Batalkan registrasi" : "Pembatalan ditutup"}</button> : <button type="button" disabled={pending || disabled} onClick={() => mutate("POST")} className="portal-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Memproses…" : "Daftar webinar"}</button>}
    {message ? <p role="status" className="mt-3 text-sm font-semibold text-slate-600">{message}</p> : null}
  </div>;
}
