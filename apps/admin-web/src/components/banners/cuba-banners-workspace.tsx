"use client";

/* eslint-disable @next/next/no-img-element -- authenticated BFF media previews have runtime URLs */

import { useEffect, useMemo, useState, useTransition } from "react";
import type { HeroBanner, CreateBannerPayload, UpdateBannerPayload, BannerAlign } from "@/types/banner";
import {
  createAdminBannerAction,
  updateAdminBannerAction,
  toggleAdminBannerActiveAction,
  deleteAdminBannerAction,
} from "@/app/actions/banners";
import { AdminDataTable, type ColumnHeader } from "@/components/admin-data-table";
import { AdminIcon } from "@/components/admin-icon";
import MediaPicker from "@/components/media/MediaPicker";

interface CubaBannersWorkspaceProps {
  initialBanners: HeroBanner[];
}

function getAdminImageUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/\/api\/v1\/media\/([0-9a-f-]{36})\/content/i);
  if (match) {
    return `/api/bff/media/${match[1]}/content`;
  }
  return url;
}

export function CubaBannersWorkspace({ initialBanners }: CubaBannersWorkspaceProps) {
  const [banners, setBanners] = useState<HeroBanner[]>(initialBanners);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("sort_order");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<HeroBanner | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateBannerPayload>({
    title: "",
    description: "",
    image_url: "",
    cta_label: "",
    cta_href: "",
    align: "left",
    sort_order: 1,
    is_active: false,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Escape key & body scroll lock for modals
  useEffect(() => {
    if (!isModalOpen && !isDeleteModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen, isDeleteModalOpen, isPending]);

  // Metrics
  const totalBanners = banners.length;
  const activeBannersCount = banners.filter((b) => b.is_active).length;
  const inactiveBannersCount = totalBanners - activeBannersCount;

  const handleSortChange = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = banners.filter((b) => {
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active) ||
        (statusFilter === "inactive" && !b.is_active);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.cta_label || "").toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "title") {
        comparison = a.title.localeCompare(b.title, "id");
      } else if (sortKey === "sort_order") {
        comparison = a.sort_order - b.sort_order;
      } else if (sortKey === "status") {
        comparison = (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [banners, statusFilter, searchQuery, sortKey, sortDirection]);

  const pagedBanners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      image_url: "",
      cta_label: "",
      cta_href: "",
      align: "left",
      sort_order: (banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 1),
      is_active: activeBannersCount < 3,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      image_url: banner.image_url,
      cta_label: banner.cta_label || "",
      cta_href: banner.cta_href || "",
      align: banner.align,
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setGeneralError(null);
    setGeneralSuccess(null);

    if (!formData.title.trim()) {
      setFormError("Judul banner wajib diisi.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Deskripsi banner wajib diisi.");
      return;
    }
    if (!formData.image_url.trim()) {
      setFormError("Gambar banner wajib dipilih dari Pustaka Media atau diunggah terlebih dahulu.");
      return;
    }

    if (formData.is_active && !editingBanner && activeBannersCount >= 3) {
      setFormError("Maksimal 3 banner yang dapat aktif secara bersamaan. Nonaktifkan banner lain terlebih dahulu.");
      return;
    }

    if (
      formData.is_active &&
      editingBanner &&
      !editingBanner.is_active &&
      activeBannersCount >= 3
    ) {
      setFormError("Maksimal 3 banner yang dapat aktif secara bersamaan. Nonaktifkan banner lain terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      if (editingBanner) {
        const payload: UpdateBannerPayload = {
          ...formData,
        };
        const res = await updateAdminBannerAction(editingBanner.id, payload);
        if (!res.success || !res.data) {
          setFormError(res.error || "Gagal memperbarui banner.");
          return;
        }
        setBanners((prev) =>
          prev.map((b) => (b.id === editingBanner.id ? res.data! : b))
        );
        setGeneralSuccess(`Banner "${formData.title}" berhasil diperbarui.`);
        setIsModalOpen(false);
      } else {
        const res = await createAdminBannerAction(formData);
        if (!res.success || !res.data) {
          setFormError(res.error || "Gagal menambahkan banner.");
          return;
        }
        setBanners((prev) => [res.data!, ...prev]);
        setGeneralSuccess(`Banner "${formData.title}" berhasil ditambahkan.`);
        setIsModalOpen(false);
      }
    });
  };

  // Toggle Active
  const handleToggleActive = (banner: HeroBanner) => {
    setGeneralError(null);
    setGeneralSuccess(null);

    if (!banner.is_active && activeBannersCount >= 3) {
      setGeneralError("Maksimal 3 banner yang dapat aktif secara bersamaan. Nonaktifkan banner lain terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const res = await toggleAdminBannerActiveAction(banner.id);
      if (!res.success || !res.data) {
        setGeneralError(res.error || "Gagal mengubah status aktif.");
        return;
      }
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? res.data! : b))
      );
      setGeneralSuccess(
        `Status banner "${banner.title}" berhasil diubah menjadi ${
          res.data.is_active ? "Aktif" : "Nonaktif"
        }.`
      );
    });
  };

  // Open Delete Modal
  const openDeleteModal = (banner: HeroBanner) => {
    setBannerToDelete(banner);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!bannerToDelete) return;
    setGeneralError(null);
    setGeneralSuccess(null);

    startTransition(async () => {
      const res = await deleteAdminBannerAction(bannerToDelete.id);
      if (!res.success) {
        setGeneralError(res.error || "Gagal menghapus banner.");
        setIsDeleteModalOpen(false);
        return;
      }
      setBanners((prev) => prev.filter((b) => b.id !== bannerToDelete.id));
      setGeneralSuccess(`Banner "${bannerToDelete.title}" berhasil dihapus.`);
      setIsDeleteModalOpen(false);
      setBannerToDelete(null);
    });
  };

  const tableHeaders: (string | ColumnHeader)[] = [
    { label: "Pratinjau Gambar", width: "w-28", align: "center" },
    { key: "title", label: "Judul & Deskripsi", sortable: true },
    { label: "Call to Action", width: "w-44" },
    { label: "Posisi", width: "w-24", align: "center" },
    { key: "sort_order", label: "Urutan", sortable: true, width: "w-20", align: "center" },
    { key: "status", label: "Status Aktif", sortable: true, width: "w-32", align: "center" },
    { label: "Aksi", width: "w-28", align: "center" },
  ];

  return (
    <div className="space-y-6" data-cuba-component="banners-workspace">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="admin-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <AdminIcon name="media" className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalBanners}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Banner Terdaftar</div>
          </div>
        </div>

        <div className="admin-card flex items-center gap-4 p-5 border-l-4 border-l-sky-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <AdminIcon name="check" className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeBannersCount} <span className="text-sm font-normal text-slate-500">/ 3</span>
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activeBannersCount === 3
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {activeBannersCount === 3 ? "Kuota Penuh" : `${3 - activeBannersCount} Tersisa`}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Banner Aktif di Web Publik (Maksimal 3)
            </div>
          </div>
        </div>

        <div className="admin-card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <AdminIcon name="clock" className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{inactiveBannersCount}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Banner Nonaktif (Cadangan)</div>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {generalError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-start gap-3">
          <AdminIcon name="alert" className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{generalError}</div>
          <button
            onClick={() => setGeneralError(null)}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-400"
          >
            ×
          </button>
        </div>
      )}

      {generalSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-3">
          <AdminIcon name="check" className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{generalSuccess}</div>
          <button
            onClick={() => setGeneralSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Main DataTable */}
      <AdminDataTable
        title="Daftar Hero Banner"
        description="Kelola slide banner utama yang ditampilkan pada beranda Web Publik. Maksimal 3 banner aktif secara bersamaan."
        itemCount={filteredAndSorted.length}
        headers={tableHeaders}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari judul atau teks banner..."
        statusFilter={statusFilter}
        statusOptions={[
          { value: "all", label: "Semua Status" },
          { value: "active", label: "Aktif" },
          { value: "inactive", label: "Nonaktif" },
        ]}
        onStatusFilterChange={setStatusFilter}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        page={page}
        pageSize={pageSize}
        total={filteredAndSorted.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <AdminIcon name="plus" className="h-4 w-4" />
            <span>Tambah Banner</span>
          </button>
        }
      >
        {pagedBanners.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Tidak ada banner yang cocok dengan kriteria filter.
            </td>
          </tr>
        ) : (
          pagedBanners.map((banner) => {
            const adminImgSrc = getAdminImageUrl(banner.image_url);
            return (
              <tr
                key={banner.id}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                {/* Pratinjau Gambar */}
                <td className="px-4 py-3 text-center">
                  <div className="relative mx-auto h-14 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    <img
                      src={adminImgSrc}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </td>

                {/* Judul & Deskripsi */}
                <td className="px-4 py-3">
                  <div className="max-w-md">
                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {banner.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {banner.description}
                    </div>
                  </div>
                </td>

                {/* Call to Action */}
                <td className="px-4 py-3">
                  {banner.cta_label ? (
                    <div className="text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {banner.cta_label}
                      </span>
                      {banner.cta_href && (
                        <div className="mt-0.5 text-[11px] text-sky-600 dark:text-sky-400 truncate max-w-[150px]">
                          {banner.cta_href}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Tidak ada CTA</span>
                  )}
                </td>

                {/* Posisi Teks */}
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                    {banner.align === "left" ? "Kiri" : banner.align === "center" ? "Tengah" : "Kanan"}
                  </span>
                </td>

                {/* Urutan */}
                <td className="px-4 py-3 text-center font-mono text-xs text-slate-700 dark:text-slate-300">
                  #{banner.sort_order}
                </td>

                {/* Switch Status Aktif */}
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={banner.is_active}
                      disabled={isPending}
                      onClick={() => handleToggleActive(banner)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                        banner.is_active ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          banner.is_active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-medium ${
                        banner.is_active ? "text-sky-600 dark:text-sky-400" : "text-slate-400"
                      }`}
                    >
                      {banner.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </td>

                {/* Aksi */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(banner)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition"
                      title="Edit Banner"
                    >
                      <AdminIcon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(banner)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                      title="Hapus Banner"
                    >
                      <AdminIcon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </AdminDataTable>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (!isPending && e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingBanner ? "Edit Hero Banner" : "Tambah Hero Banner Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Isi informasi banner slide beranda Web Publik dan pilih gambar dari Pustaka Media.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <AdminIcon name="close" className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-start gap-2">
                <AdminIcon name="alert" className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4 text-xs">
              {/* Judul */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Banner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Bangun Kompetensi untuk Masa Depan"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Subtitle <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan kalimat singkat yang menjelaskan pesan banner..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Pemilihan Gambar via Pustaka Media */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gambar Banner dari Pustaka Media <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Ambil dari aset yang telah tersedia di Pustaka Media atau unggah aset gambar baru secara langsung.
                </p>

                {formData.image_url ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="relative h-20 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 shrink-0">
                        <img
                          src={getAdminImageUrl(formData.image_url)}
                          alt="Banner Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                          Gambar Terpilih
                        </div>
                        <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {formData.image_url}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <MediaPicker
                            imageOnly
                            buttonLabel="Ganti Gambar"
                            onSelect={(selection) => {
                              setFormData((prev) => ({
                                ...prev,
                                image_url: `/api/v1/media/${selection.id}/content`,
                              }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                            className="inline-flex items-center rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-sky-400 dark:border-slate-700 dark:hover:border-sky-500 transition">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 mb-2">
                      <AdminIcon name="media" className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Belum ada gambar yang dipilih
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
                      Pilih gambar beresolusi lanskap dari Pustaka Media atau unggah berkas baru secara langsung.
                    </p>
                    <MediaPicker
                      imageOnly
                      buttonLabel="Pilih atau Unggah dari Pustaka Media"
                      onSelect={(selection) => {
                        setFormData((prev) => ({
                          ...prev,
                          image_url: `/api/v1/media/${selection.id}/content`,
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Call to Action Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Label Tombol CTA (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.cta_label}
                    onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                    placeholder="Contoh: Jelajahi Katalog"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tautan Tombol CTA (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={1024}
                    value={formData.cta_href}
                    onChange={(e) => setFormData({ ...formData, cta_href: e.target.value })}
                    placeholder="Contoh: /catalog atau /microlearning"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Posisi Teks & Urutan Tampil */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Posisi / Perataan Teks
                  </label>
                  <select
                    value={formData.align}
                    onChange={(e) => setFormData({ ...formData, align: e.target.value as BannerAlign })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="left">Rata Kiri (Left)</option>
                    <option value="center">Rata Tengah (Center)</option>
                    <option value="right">Rata Kanan (Right)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Urutan Slide (Sort Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Status Aktif Switch */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Status Aktif di Web Publik</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Maksimal 3 banner yang dapat aktif bersamaan ({activeBannersCount}/3 aktif saat ini).
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.is_active}
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                    formData.is_active ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.is_active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white shadow-sm hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : editingBanner ? "Perbarui Banner" : "Simpan Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {isDeleteModalOpen && bannerToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (!isPending && e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AdminIcon name="alert" className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Hero Banner
              </h3>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus banner <strong>&ldquo;{bannerToDelete.title}&rdquo;</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition disabled:opacity-50"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
