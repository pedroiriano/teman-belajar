"use client";

import { useState } from "react";
import type { RecommendationPinItem, CreateRecommendationPinInput } from "@/types/recommendation";
import {
  createAdminRecommendationPinAction,
  deleteAdminRecommendationPinAction,
} from "@/app/actions/recommendations";

interface CubaRecommendationWorkspaceProps {
  initialPins: RecommendationPinItem[];
}

export function CubaRecommendationWorkspace({ initialPins }: CubaRecommendationWorkspaceProps) {
  const [pins, setPins] = useState<RecommendationPinItem[]>(initialPins);
  const [filter, setFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRecommendationPinInput>({
    target_type: "knowledge",
    target_id: "",
    title: "",
    weight: 100,
  });

  const filtered = pins.filter((p) => {
    if (filter === "all") return true;
    return p.target_type === filter;
  });

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.target_id.trim() || !formData.title.trim()) {
      setFormError("ID target dan judul konten wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const res = await createAdminRecommendationPinAction(formData);
    setIsSubmitting(false);

    if (!res.success || !res.data) {
      setFormError(res.error || "Gagal menyematkan konten.");
      return;
    }

    setPins([res.data, ...pins]);
    setFormData({
      target_type: "knowledge",
      target_id: "",
      title: "",
      weight: 100,
    });
    setFormSuccess("Konten berhasil disematkan ke kurasi rekomendasi!");
  };

  const handleDeletePin = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pin rekomendasi ini?")) return;

    const res = await deleteAdminRecommendationPinAction(id);
    if (res.success) {
      setPins(pins.filter((p) => p.id !== id));
    } else {
      alert(res.error || "Gagal menghapus pin.");
    }
  };

  return (
    <div className="space-y-6" data-cuba-component="recommendation-workspace">
      {/* Top Banner & Info */}
      <div className="admin-card p-5 border-l-4 border-l-sky-500 bg-sky-50/40 dark:bg-sky-950/20">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600 dark:text-sky-400">
            <span className="text-base font-black">★</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Kurasi Rekomendasi & Editorial Pinning (TASK-023)
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Konten yang disematkan (*pinned*) akan mendapatkan prioritas bobot lebih tinggi pada feed
              rekomendasi pengguna di beranda Portal publik, dihitung bersama riwayat belajar dan minat topik.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pin Form */}
        <div className="admin-card p-5 space-y-4 lg:col-span-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sematkan Konten Baru</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tambahkan konten terpilih ke daftar sorotan editorial.</p>
          </div>

          <form onSubmit={handleCreatePin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipe Konten
              </label>
              <select
                value={formData.target_type}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="knowledge">Pusat Pengetahuan</option>
                <option value="microlearning">Pembelajaran Singkat</option>
                <option value="course">Kursus Pelatihan</option>
                <option value="news">Berita Penting</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Judul Konten
              </label>
              <input
                type="text"
                placeholder="Contoh: Pengantar Keamanan Siber"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                ID / Slug Target
              </label>
              <input
                type="text"
                placeholder="art-123 atau slug-konten"
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Bobot Rekomendasi
                </label>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{formData.weight}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="w-full accent-sky-600"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Nilai lebih tinggi menaikkan urutan tampil rekomendasi.
              </span>
            </div>

            {formError && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-button-primary w-full text-xs font-bold py-2.5"
            >
              {isSubmitting ? "Menyimpan..." : "Sematkan Konten"}
            </button>
          </form>
        </div>

        {/* Right: Pinned List */}
        <div className="admin-card p-5 space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Konten Tersemat Aktif</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daftar sorotan yang saat ini memengaruhi algoritma beranda.
              </p>
            </div>
            <div className="flex gap-1.5">
              {["all", "knowledge", "microlearning", "course", "news"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    filter === t
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {t === "all" ? "Semua" : t === "knowledge" ? "Pengetahuan" : t === "microlearning" ? "Mikro" : t === "course" ? "Kursus" : "Berita"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Konten Rekomendasi</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Bobot</th>
                  <th className="px-4 py-3">Disematkan Oleh</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      Belum ada konten yang disematkan untuk kategori ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((pin) => (
                    <tr key={pin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <p>{pin.title}</p>
                        <p className="font-mono text-[11px] text-slate-400">{pin.target_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 font-bold text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                          {pin.target_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-700 dark:text-slate-300">
                        {pin.weight}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {pin.pinned_by}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePin(pin.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
