export type BulkActionType = "approve" | "publish" | "archive" | "delete";

export type BulkActionModule = "knowledge" | "news" | "announcements" | "review-queue";

export interface BulkSelectedItem {
  id: string;
  title: string;
  currentStatus?: string;
  module: BulkActionModule;
  slug?: string;
}

export interface BulkOperationProgress {
  total: number;
  current: number;
  currentTitle: string;
  percent: number;
}

export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    title: string;
    error: string;
  }>;
}

export interface BulkActionConfig {
  action: BulkActionType;
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  buttonClass: string;
  targetStatus?: string;
}

export const BULK_ACTION_CONFIGS: Record<BulkActionType, BulkActionConfig> = {
  approve: {
    action: "approve",
    label: "Setujui Terpilih",
    confirmTitle: "Persetujuan Massal Konten",
    confirmDescription: "Item yang dipilih akan disetujui untuk melanjutkan ke alur kerja publikasi.",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    targetStatus: "approved",
  },
  publish: {
    action: "publish",
    label: "Terbitkan Terpilih",
    confirmTitle: "Publikasi Massal Konten",
    confirmDescription: "Item yang dipilih akan langsung diterbitkan dan dapat diakses oleh publik di portal pembelajar.",
    buttonClass: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500",
    targetStatus: "published",
  },
  archive: {
    action: "archive",
    label: "Arsipkan Terpilih",
    confirmTitle: "Pengarsipan Massal Konten",
    confirmDescription: "Item yang dipilih akan diarsipkan dan ditarik dari daftar pencarian publik.",
    buttonClass: "bg-slate-700 hover:bg-slate-800 text-white focus:ring-slate-500",
    targetStatus: "archived",
  },
  delete: {
    action: "delete",
    label: "Hapus / Tolak Terpilih",
    confirmTitle: "Penolakan / Penghapusan Massal Konten",
    confirmDescription: "Item yang dipilih akan ditolak atau dihapus dari antrean aktif. Pastikan tindakan ini benar sebelum melanjutkan.",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    targetStatus: "rejected",
  },
};
