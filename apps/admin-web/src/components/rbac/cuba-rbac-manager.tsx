"use client";

import { useState, useMemo } from "react";
import { AdminIcon } from "@/components/admin-icon";
import {
  ModuleCategory,
  PermissionAction,
  PERMISSION_ACTION_LABELS,
  PermissionModule,
  PLATFORM_MODULES,
  RolePolicy,
} from "@/types/rbac";
import { CubaCreateRoleModal } from "@/components/rbac/cuba-create-role-modal";
import { deleteCustomRoleAction, updateRolePolicyAction } from "@/app/actions/rbac";

interface CubaRbacManagerProps {
  initialRoles: RolePolicy[];
  modules?: PermissionModule[];
}

type RbacTab = "roles" | "matrix" | "simulator";

export function CubaRbacManager({
  initialRoles,
  modules = PLATFORM_MODULES,
}: CubaRbacManagerProps) {
  const [roles, setRoles] = useState<RolePolicy[]>(initialRoles);
  const [activeTab, setActiveTab] = useState<RbacTab>("roles");
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoles[0]?.id || "content-editor"
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const handleOpenCreateModal = () => setIsCreateModalOpen(true);
  const handleCloseCreateModal = () => setIsCreateModalOpen(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<string>("Semua");

  // State for matrix editing of the currently selected role
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  const [permissionsState, setPermissionsState] = useState<Record<string, PermissionAction[]>>(() => {
    return structuredClone(selectedRole?.permissions || {});
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // When selected role changes, update permissions editing state
  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const target = roles.find((r) => r.id === roleId);
    if (target) {
      setPermissionsState(structuredClone(target.permissions));
      setFeedback(null);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = roles.length;
    const system = roles.filter((r) => r.isSystem).length;
    const custom = total - system;
    const totalPerms = roles.reduce((acc, r) => {
      const count = Object.values(r.permissions).reduce((sum, actions) => sum + actions.length, 0);
      return acc + count;
    }, 0);

    return {
      total,
      system,
      custom,
      totalPerms,
    };
  }, [roles]);

  // Filtered roles in directory view
  const filteredRoles = useMemo(() => {
    const q = roleSearchQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [roles, roleSearchQuery]);

  // Filtered modules in matrix view
  const filteredModules = useMemo(() => {
    if (moduleCategoryFilter === "Semua") return modules;
    return modules.filter((m) => m.category === moduleCategoryFilter);
  }, [modules, moduleCategoryFilter]);

  // Toggle single permission checkbox
  const handleTogglePermission = (moduleId: string, action: PermissionAction) => {
    setPermissionsState((prev) => {
      const currentActions = prev[moduleId] || [];
      const hasAction = currentActions.includes(action);
      const updatedActions = hasAction
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];

      return {
        ...prev,
        [moduleId]: updatedActions,
      };
    });
  };

  // Toggle all supported actions for a module row
  const handleToggleAllRow = (module: PermissionModule) => {
    setPermissionsState((prev) => {
      const currentActions = prev[module.id] || [];
      const isAllChecked = module.supportedActions.every((a) => currentActions.includes(a));
      return {
        ...prev,
        [module.id]: isAllChecked ? [] : [...module.supportedActions],
      };
    });
  };

  // Save modified permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateRolePolicyAction(selectedRole.id, permissionsState);
      if (!res.success || !res.role) {
        setFeedback({ type: "error", message: res.error || "Gagal menyimpan perubahan izin." });
        return;
      }

      setRoles((prev) => prev.map((r) => (r.id === res.role!.id ? res.role! : r)));
      setFeedback({ type: "success", message: `Izin untuk peran "${res.role.name}" berhasil diperbarui.` });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete custom role
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus peran kustom "${roleName}"?`)) {
      return;
    }

    try {
      const res = await deleteCustomRoleAction(roleId);
      if (!res.success) {
        alert(res.error || "Gagal menghapus peran.");
        return;
      }

      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      if (selectedRoleId === roleId) {
        setSelectedRoleId(roles[0]?.id || "");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  };

  // Simulator state
  const [simModuleId, setSimModuleId] = useState<string>("knowledge");
  const [simAction, setSimAction] = useState<PermissionAction>("publish");

  const simResult = useMemo(() => {
    if (!selectedRole) return false;
    const actions = selectedRole.permissions[simModuleId] || [];
    return actions.includes(simAction);
  }, [selectedRole, simModuleId, simAction]);

  const actionsList: PermissionAction[] = ["read", "create", "edit", "review", "publish", "delete"];
  const categories: ("Semua" | ModuleCategory)[] = [
    "Semua",
    "Konten & Editorial",
    "Pembelajaran",
    "Ruang Kerja",
    "Administrasi Platform",
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "roles"
                ? "bg-sky-600 text-white shadow-sm dark:bg-sky-500"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Daftar Peran ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-sky-600 text-white shadow-sm dark:bg-sky-500"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Matriks Izin Granular
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "simulator"
                ? "bg-sky-600 text-white shadow-sm dark:bg-sky-500"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Simulator Kebijakan
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="cuba-action-btn admin-button cuba-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
        >
          <AdminIcon name="users" className="h-4 w-4" />
          <span>+ Buat Peran Kustom</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PERAN (DIRECTORY VIEW) */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="cuba-kpi-card p-5">
              <span className="admin-kicker">TOTAL PERAN TERDEFINISI</span>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{kpis.total}</p>
              <p className="mt-1 text-xs text-slate-500">Kombinasi hak akses aktif dalam sistem.</p>
            </article>

            <article className="cuba-kpi-card p-5">
              <span className="admin-kicker">PERAN BAWAAN SISTEM</span>
              <p className="mt-3 text-3xl font-black text-sky-600 dark:text-sky-400">{kpis.system}</p>
              <p className="mt-1 text-xs text-slate-500">Terproteksi dengan baseline keamanan tetap.</p>
            </article>

            <article className="cuba-kpi-card p-5">
              <span className="admin-kicker">PERAN KUSTOM TAMBAHAN</span>
              <p className="mt-3 text-3xl font-black text-indigo-600 dark:text-indigo-400">{kpis.custom}</p>
              <p className="mt-1 text-xs text-slate-500">Peran yang dibuat khusus oleh administrator.</p>
            </article>

            <article className="cuba-kpi-card p-5">
              <span className="admin-kicker">MODUL TERLINDUNGI</span>
              <p className="mt-3 text-3xl font-black text-emerald-600 dark:text-emerald-400">{modules.length}</p>
              <p className="mt-1 text-xs text-slate-500">Entitas modul dengan otorisasi per-tindakan.</p>
            </article>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <AdminIcon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder="Cari peran berdasarkan nama atau deskripsi..."
                className="admin-input pl-10"
              />
            </div>
          </div>

          {/* Roles Grid Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoles.map((role) => {
              const activeModuleCount = Object.keys(role.permissions).length;
              return (
                <article
                  key={role.id}
                  className="admin-card flex flex-col justify-between p-5 transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {role.name}
                        </h3>
                        <span
                          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            role.isSystem
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                          }`}
                        >
                          {role.isSystem ? "Peran Sistem" : "Peran Kustom"}
                        </span>
                      </div>
                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {role.userCount} Pengguna
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {role.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
                      <AdminIcon name="check" className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>
                        Akses pada <strong>{activeModuleCount}</strong> dari {modules.length} modul
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectRole(role.id);
                        setActiveTab("matrix");
                      }}
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400"
                    >
                      Kelola Matriks Izin &rarr;
                    </button>

                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                        title="Hapus peran kustom ini"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MATRIKS IZIN GRANULAR (MATRIX VIEW) */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Selected Role Switcher Header Card */}
          <div className="admin-card p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="admin-kicker">KONFIGURASI OTORISASI</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedRole?.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      selectedRole?.isSystem
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                    }`}
                  >
                    {selectedRole?.isSystem ? "Sistem" : "Kustom"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                  {selectedRole?.description}
                </p>
              </div>

              {/* Role Select Dropdown & Save Button */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label htmlFor="role-selector" className="sr-only">
                    Pilih Peran
                  </label>
                  <select
                    id="role-selector"
                    value={selectedRoleId}
                    onChange={(e) => handleSelectRole(e.target.value)}
                    className="admin-select min-w-[200px]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isSystem ? "(Sistem)" : "(Kustom)"}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="cuba-action-btn admin-button cuba-btn-primary inline-flex items-center gap-2"
                >
                  <AdminIcon name="check" className="h-4 w-4" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan Izin"}</span>
                </button>
              </div>
            </div>

            {/* Alert banner */}
            {feedback && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
                  feedback.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {feedback.message}
              </div>
            )}
          </div>

          {/* Module Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setModuleCategoryFilter(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  moduleCategoryFilter === cat
                    ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Permission Matrix Table */}
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                    <th className="p-4 font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-[240px]">
                      Modul Platform
                    </th>
                    {actionsList.map((action) => (
                      <th
                        key={action}
                        className="p-4 text-center font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-[80px]"
                        title={PERMISSION_ACTION_LABELS[action].description}
                      >
                        {PERMISSION_ACTION_LABELS[action].label}
                      </th>
                    ))}
                    <th className="p-4 text-center font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-[100px]">
                      Aksi Cepat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredModules.map((module) => {
                    const moduleActions = permissionsState[module.id] || [];
                    const isAllChecked = module.supportedActions.every((a) => moduleActions.includes(a));

                    return (
                      <tr
                        key={module.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {module.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400 truncate max-w-sm">
                            {module.description}
                          </div>
                          <span className="mt-1 inline-block text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                            {module.category}
                          </span>
                        </td>

                        {actionsList.map((action) => {
                          const isSupported = module.supportedActions.includes(action);
                          const isChecked = moduleActions.includes(action);

                          return (
                            <td key={action} className="p-4 text-center">
                              {isSupported ? (
                                <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(module.id, action)}
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
                                    aria-label={`Izin ${PERMISSION_ACTION_LABELS[action].label} untuk ${module.name}`}
                                  />
                                </label>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 font-bold">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAllRow(module)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            {isAllChecked ? "Lepas Semua" : "Pilih Semua"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIMULATOR KEBIJAKAN AKSES */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <article className="admin-card p-6">
            <div>
              <span className="admin-kicker">EVALUASI KEAMANAN WAKTU NYATA</span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Simulator Kebijakan Hak Akses (RBAC Simulator)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Uji langsung apakah suatu kombinasi peran diizinkan untuk mengeksekusi tindakan tertentu pada modul.
              </p>
            </div>

            {/* Selector Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="sim-role" className="admin-label">
                  Peran yang Diuji
                </label>
                <select
                  id="sim-role"
                  value={selectedRoleId}
                  onChange={(e) => handleSelectRole(e.target.value)}
                  className="admin-select"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sim-module" className="admin-label">
                  Target Modul Platform
                </label>
                <select
                  id="sim-module"
                  value={simModuleId}
                  onChange={(e) => setSimModuleId(e.target.value)}
                  className="admin-select"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sim-action" className="admin-label">
                  Tindakan Operasional
                </label>
                <select
                  id="sim-action"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value as PermissionAction)}
                  className="admin-select"
                >
                  {actionsList.map((act) => (
                    <option key={act} value={act}>
                      {PERMISSION_ACTION_LABELS[act].label} ({act})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simulation Result Box */}
            <div className="mt-8 rounded-2xl border p-6 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${
                    simResult ? "bg-emerald-500 shadow-md" : "bg-rose-500 shadow-md"
                  }`}
                >
                  <AdminIcon name={simResult ? "check" : "x"} className="h-6 w-6" />
                </div>
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider ${
                      simResult
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {simResult ? "AKSES DIIZINKAN (ALLOWED)" : "AKSES DITOLAK (DENIED)"}
                  </span>
                  <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                    Peran &ldquo;{selectedRole?.name}&rdquo; {simResult ? "memiliki hak" : "tidak memiliki hak"} untuk melakukan tindakan &ldquo;{PERMISSION_ACTION_LABELS[simAction].label}&rdquo; pada modul &ldquo;{modules.find((m) => m.id === simModuleId)?.name}&rdquo;.
                  </h3>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
                <p>
                  <strong>Rincian Kebijakan:</strong> {selectedRole?.name} saat ini memiliki hak akses [
                  {(selectedRole?.permissions[simModuleId] || []).join(", ") || "tidak ada"}] pada modul ini.
                </p>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Role Creation Modal */}
      <CubaCreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        roles={roles}
        onRoleCreated={(newRole) => {
          setRoles((prev) => [...prev, newRole]);
          setSelectedRoleId(newRole.id);
          setActiveTab("matrix");
        }}
      />
    </div>
  );
}
