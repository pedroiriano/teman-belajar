"use client";

import type { DraftPayload, DraftRecovery, DraftSaveState } from "./types";

const stateLabel: Record<DraftSaveState, string> = {
  memuat: "Menyiapkan",
  siap: "Auto-save aktif",
  menunggu: "Belum disimpan",
  menyimpan: "Menyimpan",
  tersimpan: "Tersimpan",
  lokal: "Tersimpan lokal",
  konflik: "Konflik draft",
  gagal: "Gagal menyimpan",
};

interface Props<TPayload extends DraftPayload> {
  state: DraftSaveState;
  message: string;
  lastSavedAt?: string;
  recovery?: DraftRecovery<TPayload>;
  onRecover: (source: "server" | "local") => void;
  onKeepCurrent: () => void;
  onDiscard: () => void;
  onStartNew: () => void;
  onRetry: () => void;
  allowStartNew?: boolean;
}

export function DraftStatus<TPayload extends DraftPayload>({ state, message, lastSavedAt, recovery, onRecover, onKeepCurrent, onDiscard, onStartNew, onRetry, allowStartNew = true }: Props<TPayload>) {
  const statusClass = state === "konflik" || state === "gagal" ? "draft-status-error" : state === "lokal" || state === "menunggu" ? "draft-status-warning" : "draft-status-ok";
  return (
    <section className={`draft-status ${statusClass}`} aria-labelledby="draft-status-title">
      <div className="min-w-0">
        <p id="draft-status-title" className="text-sm font-black">{stateLabel[state]}</p>
        <p className="mt-1 text-xs leading-5" aria-live="polite" aria-atomic="true">{message}</p>
        {lastSavedAt && <p className="mt-1 text-[11px]">Terakhir: {new Date(lastSavedAt).toLocaleString("id-ID")}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(state === "lokal" || state === "gagal") && <button type="button" className="admin-button-secondary" onClick={onRetry}>Coba lagi</button>}
        {allowStartNew && <button type="button" className="admin-button-secondary" onClick={onStartNew}>Draft baru</button>}
      </div>
      {recovery && (
        <div className="draft-recovery" role="alert">
          <div>
            <h2 className="font-black">Pulihkan pekerjaan sebelumnya?</h2>
            <p className="mt-1 text-sm leading-6">{recovery.conflict ? "Salinan server dan perangkat berbeda. Pilih salah satu secara sadar; tidak ada versi yang ditimpa otomatis." : "Draft tersimpan ditemukan. Anda dapat memulihkannya atau mempertahankan isi form saat ini."}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recovery.server && <button type="button" className={recovery.recommended === "server" ? "admin-button" : "admin-button-secondary"} onClick={() => onRecover("server")}>Pulihkan versi server</button>}
            {recovery.local && <button type="button" className={recovery.recommended === "local" ? "admin-button" : "admin-button-secondary"} onClick={() => onRecover("local")}>Pulihkan versi perangkat</button>}
            <button type="button" className="admin-button-secondary" onClick={onKeepCurrent}>Pertahankan isi saat ini</button>
            <button type="button" className="admin-button-secondary" onClick={onDiscard}>Buang draft tersimpan</button>
          </div>
        </div>
      )}
    </section>
  );
}
