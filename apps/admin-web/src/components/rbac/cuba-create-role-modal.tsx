"use client";

import { useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { RolePolicy } from "@/types/rbac";
import { createCustomRoleAction } from "@/app/actions/rbac";

interface CubaCreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RolePolicy[];
  onRoleCreated: (role: RolePolicy) => void;
}

export function CubaCreateRoleModal({
  isOpen,
  onClose,
  roles,
  onRoleCreated,
}: CubaCreateRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateRoleId, setTemplateRoleId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama peran wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createCustomRoleAction(
        name.trim(),
        description.trim(),
        templateRoleId || undefined
      );

      if (!res.success || !res.role) {
        setError(res.error || "Gagal membuat peran.");
        setIsSubmitting(false);
        return;
      }

      onRoleCreated(res.role);
      setName("");
      setDescription("");
      setTemplateRoleId("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-role-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[15px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <AdminIcon name="users" className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-role-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                Buat Peran Kustom Baru
              </h2>
              <p className="text-xs text-slate-500">
                Definisikan jabatan dan set izin hak akses untuk staf atau editor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup dialog"
          >
            <AdminIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="role-name" className="admin-label">
              Nama Peran <span className="text-rose-500">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              required
              maxLength={100}
              placeholder="Contoh: Koordinator Warta & Berita"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <label htmlFor="role-description" className="admin-label">
              Deskripsi Tanggung Jawab
            </label>
            <textarea
              id="role-description"
              rows={3}
              maxLength={250}
              placeholder="Jelaskan cakupan wewenang dan tugas pemegang peran ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-textarea"
            />
          </div>

          <div>
            <label htmlFor="role-template" className="admin-label">
              Salin Hak Akses Awal Dari Template (Opsional)
            </label>
            <select
              id="role-template"
              value={templateRoleId}
              onChange={(e) => setTemplateRoleId(e.target.value)}
              className="admin-select"
            >
              <option value="">-- Izin Minimal Standar (Hanya Lihat Dasar) --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSystem ? "(Sistem)" : "(Kustom)"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Anda tetap dapat menyesuaikan centang izin granular setelah peran dibuat.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="admin-button-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cuba-action-btn admin-button cuba-btn-primary inline-flex items-center gap-2"
            >
              <AdminIcon name="check" className="h-4 w-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Peran Baru"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
