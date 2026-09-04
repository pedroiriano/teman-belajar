import { PermissionAction, PLATFORM_MODULES, RolePolicy } from "@/types/rbac";

const ALL_ACTIONS: PermissionAction[] = ["read", "create", "edit", "review", "publish", "delete"];

// Pemetaan izin default untuk peran bawaan sistem
const CANONICAL_ROLE_DEFAULTS: RolePolicy[] = [
  {
    id: "super-administrator",
    name: "Super Administrator",
    description: "Akses penuh tanpa batas ke seluruh modul, konfigurasi sistem, dan manajemen keamanan.",
    isSystem: true,
    userCount: 2,
    permissions: PLATFORM_MODULES.reduce((acc, m) => {
      acc[m.id] = [...m.supportedActions];
      return acc;
    }, {} as Record<string, PermissionAction[]>),
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "portal-administrator",
    name: "Portal Administrator",
    description: "Pengelola utama platform dengan wewenang penuh atas konten, pengguna, integrasi, dan audit.",
    isSystem: true,
    userCount: 4,
    permissions: PLATFORM_MODULES.reduce((acc, m) => {
      acc[m.id] = [...m.supportedActions];
      return acc;
    }, {} as Record<string, PermissionAction[]>),
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "content-editor",
    name: "Content Editor",
    description: "Penulis dan pengelola draf materi editorial pada Pusat Pengetahuan, Berita, dan Pengumuman.",
    isSystem: true,
    userCount: 8,
    permissions: {
      knowledge: ["read", "create", "edit"],
      news: ["read", "create", "edit"],
      announcements: ["read", "create", "edit"],
      "media-gallery": ["read", "create", "edit"],
      workflow: ["read", "edit"],
      "review-queue": ["read"],
      schedule: ["read"],
      statistics: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Peninjau editorial yang memverifikasi kelayakan draf sebelum diterbitkan ke publik.",
    isSystem: true,
    userCount: 5,
    permissions: {
      knowledge: ["read", "review"],
      news: ["read", "review"],
      announcements: ["read", "review"],
      "media-gallery": ["read"],
      workflow: ["read", "edit"],
      "review-queue": ["read", "review", "publish"],
      schedule: ["read", "create", "edit"],
      statistics: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "course-manager",
    name: "Course Manager",
    description: "Pengelola program pelatihan formal, silabus kursus, dan penetapan jalur belajar.",
    isSystem: true,
    userCount: 6,
    permissions: {
      "training-programs": ["read", "create", "edit", "review", "publish"],
      microlearning: ["read", "create", "edit", "review", "publish"],
      "learning-paths": ["read", "create", "edit", "review", "publish"],
      "media-gallery": ["read", "create"],
      workflow: ["read"],
      statistics: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "instructor",
    name: "Instructor",
    description: "Instruktur dan pengajar materi pelatihan serta kurator kuis microlearning.",
    isSystem: true,
    userCount: 12,
    permissions: {
      "training-programs": ["read", "edit"],
      microlearning: ["read", "create", "edit"],
      "learning-paths": ["read"],
      "media-gallery": ["read", "create"],
      statistics: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "auditor",
    name: "Auditor",
    description: "Pemeriksa independen dengan hak akses inspeksi hanya-lihat pada log dan seluruh modul.",
    isSystem: true,
    userCount: 3,
    permissions: PLATFORM_MODULES.reduce((acc, m) => {
      acc[m.id] = ["read"];
      return acc;
    }, {} as Record<string, PermissionAction[]>),
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "lms-administrator",
    name: "LMS Administrator",
    description: "Administrator sistem manajemen pembelajaran (Moodle sync & integrasi kursus).",
    isSystem: true,
    userCount: 2,
    permissions: {
      "training-programs": ["read", "create", "edit", "publish", "delete"],
      microlearning: ["read", "create", "edit", "publish"],
      "learning-paths": ["read", "create", "edit", "publish"],
      "integration-health": ["read"],
      users: ["read", "edit"],
      statistics: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "learner",
    name: "Learner",
    description: "Peserta belajar aktif dengan akses membaca materi publik dan program terdaftar.",
    isSystem: true,
    userCount: 154,
    permissions: {
      knowledge: ["read"],
      news: ["read"],
      announcements: ["read"],
      "training-programs": ["read"],
      microlearning: ["read"],
      "learning-paths": ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "guest",
    name: "Guest",
    description: "Pengunjung tanpa akun dengan akses baca terbatas pada konten terbuka.",
    isSystem: true,
    userCount: 0,
    permissions: {
      knowledge: ["read"],
      news: ["read"],
      announcements: ["read"],
    },
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

class RbacPolicyStore {
  private roles: Map<string, RolePolicy> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.roles.clear();
    for (const role of CANONICAL_ROLE_DEFAULTS) {
      this.roles.set(role.id, structuredClone(role));
    }
  }

  public getRolePolicies(): RolePolicy[] {
    return Array.from(this.roles.values());
  }

  public getRolePolicy(id: string): RolePolicy | undefined {
    return this.roles.get(id);
  }

  public updateRolePermissions(
    id: string,
    permissions: Record<string, PermissionAction[]>,
    description?: string
  ): RolePolicy {
    const existing = this.roles.get(id);
    if (!existing) {
      throw new Error(`Peran dengan ID "${id}" tidak ditemukan.`);
    }

    // Baseline guard: Portal Administrator & Super Administrator must retain read access to platform
    if (existing.isSystem && (existing.id === "super-administrator" || existing.id === "portal-administrator")) {
      if (!permissions.roles?.includes("read")) {
        permissions.roles = Array.from(new Set([...(permissions.roles || []), "read"]));
      }
      if (!permissions.users?.includes("read")) {
        permissions.users = Array.from(new Set([...(permissions.users || []), "read"]));
      }
    }

    const updated: RolePolicy = {
      ...existing,
      permissions: structuredClone(permissions),
      description: description ?? existing.description,
      updatedAt: new Date().toISOString(),
    };

    this.roles.set(id, updated);
    return updated;
  }

  public createCustomRole(
    name: string,
    description: string,
    templateRoleId?: string
  ): RolePolicy {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Nama peran tidak boleh kosong.");
    }

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const roleId = `custom-${slug}`;
    if (this.roles.has(roleId)) {
      throw new Error(`Peran dengan nama "${trimmedName}" sudah ada.`);
    }

    let initialPermissions: Record<string, PermissionAction[]> = {};
    if (templateRoleId && this.roles.has(templateRoleId)) {
      initialPermissions = structuredClone(this.roles.get(templateRoleId)!.permissions);
    } else {
      // Default: read access to knowledge and news
      initialPermissions = {
        knowledge: ["read"],
        news: ["read"],
      };
    }

    const newRole: RolePolicy = {
      id: roleId,
      name: trimmedName,
      description: description.trim() || `Peran kustom ${trimmedName}`,
      isSystem: false,
      userCount: 0,
      permissions: initialPermissions,
      updatedAt: new Date().toISOString(),
    };

    this.roles.set(roleId, newRole);
    return newRole;
  }

  public deleteCustomRole(id: string): boolean {
    const role = this.roles.get(id);
    if (!role) {
      return false;
    }
    if (role.isSystem) {
      throw new Error("Peran sistem tidak dapat dihapus.");
    }
    return this.roles.delete(id);
  }

  public isActionAllowed(roleId: string, moduleId: string, action: PermissionAction): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;
    const moduleActions = role.permissions[moduleId];
    return Array.isArray(moduleActions) && moduleActions.includes(action);
  }
}

// Global Singleton for runtime consistency
declare global {
  var __cubaRbacPolicyStore__: RbacPolicyStore | undefined;
}

export const rbacPolicyStore = globalThis.__cubaRbacPolicyStore__ ?? new RbacPolicyStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.__cubaRbacPolicyStore__ = rbacPolicyStore;
}
