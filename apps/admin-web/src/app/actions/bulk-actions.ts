"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { transitionKnowledgeAction } from "@/app/actions/knowledge";
import { transitionNewsAction, transitionAnnouncementAction } from "@/app/actions/cms";
import { transitionReviewItemAction } from "@/app/actions/review-queue";
import { broadcastEditorialUpdate } from "@/lib/notifications/stream-hub";
import type { BulkActionType, BulkActionModule, BulkOperationResult } from "@/types/bulk-actions";

export async function executeBulkActionAction(
  targetModule: BulkActionModule,
  action: BulkActionType,
  items: Array<{ id: string; title: string; currentStatus?: string; module?: string }>
): Promise<BulkOperationResult> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return {
      total: items.length,
      succeeded: 0,
      failed: items.length,
      errors: items.map((it) => ({
        id: it.id,
        title: it.title,
        error: "Sesi tidak terotentikasi atau kadaluarsa",
      })),
    };
  }

  const userRoles: string[] = session.roles || [];
  const hasAccess = userRoles.some((r) =>
    ["Super Administrator", "Portal Administrator", "Content Editor", "Reviewer"].includes(r)
  );

  if (!hasAccess) {
    return {
      total: items.length,
      succeeded: 0,
      failed: items.length,
      errors: items.map((it) => ({
        id: it.id,
        title: it.title,
        error: "Izin tidak memadai untuk mengeksekusi aksi massal",
      })),
    };
  }

  const result: BulkOperationResult = {
    total: items.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Map action to target status string
  const targetStatusMap: Record<BulkActionType, string> = {
    approve: "approved",
    publish: "published",
    archive: "archived",
    delete: "rejected",
  };
  const targetStatus = targetStatusMap[action] || "draft";

  const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
  try {
    const payload = {
      action,
      items: items.map((it) => ({
        id: it.id,
        module: it.module || targetModule,
        title: it.title,
      })),
      notes: `Aksi massal (${action}) oleh ${session.user?.name || "Administrator"}`,
    };

    const response = await fetch(`${API_BASE}/api/v1/admin/batch-transitions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const batchResult: BulkOperationResult = await response.json();
      for (const item of items) {
        const isFailed = batchResult.errors?.some((e) => e.id === item.id);
        if (!isFailed) {
          const resolvedModule = (item.module || targetModule) as BulkActionModule;
          broadcastEditorialUpdate({
            id: item.id,
            title: item.title,
            module: resolvedModule,
            module_label:
              resolvedModule === "knowledge"
                ? "Pengetahuan"
                : resolvedModule === "news"
                ? "Berita"
                : resolvedModule === "announcements"
                ? "Pengumuman"
                : "Antrean Peninjauan",
            action: action === "approve" ? "approved" : action === "publish" ? "published" : "draft",
            action_label: action === "approve" ? "Disetujui" : action === "publish" ? "Terbit" : "Draf",
            reviewer_name: session.user?.name || "Administrator",
            reviewer_notes: `Operasi massal: ${action}`,
            deep_link: `/dashboard/${resolvedModule === "review-queue" ? "review-queue" : resolvedModule}/${item.id}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      revalidatePath("/dashboard/knowledge");
      revalidatePath("/dashboard/news");
      revalidatePath("/dashboard/announcements");
      revalidatePath("/dashboard/review-queue");
      revalidatePath("/dashboard/statistics");

      return batchResult;
    }
  } catch {
    // Fallback to sequential execution below if API fails or unreachable
  }

  for (const item of items) {
    try {
      let opSuccess = false;
      let errorDetail = "";

      const resolvedModule = (item.module || targetModule) as BulkActionModule;

      if (resolvedModule === "knowledge") {
        const res = await transitionKnowledgeAction(item.id, targetStatus);
        if (res.success) {
          opSuccess = true;
        } else {
          errorDetail = res.error || "Gagal mengubah status artikel pengetahuan";
        }
      } else if (resolvedModule === "news") {
        const res = await transitionNewsAction(item.id, targetStatus);
        if (res.success) {
          opSuccess = true;
        } else {
          errorDetail = res.error || "Gagal mengubah status berita";
        }
      } else if (resolvedModule === "announcements") {
        const res = await transitionAnnouncementAction(item.id, targetStatus);
        if (res.success) {
          opSuccess = true;
        } else {
          errorDetail = res.error || "Gagal mengubah status pengumuman";
        }
      } else if (resolvedModule === "review-queue") {
        const itemModuleType = (item.module || "knowledge") as any;
        const reviewStatus = action === "delete" ? "draft" : targetStatus;
        const note = `Aksi massal (${action}) oleh ${session.user?.name || "Administrator"}`;
        const res = await transitionReviewItemAction({
          id: item.id,
          module: itemModuleType,
          targetStatus: reviewStatus,
          reviewerNotes: note,
        });
        if (res.success) {
          opSuccess = true;
        } else {
          errorDetail = res.error || "Gagal memperbarui antrean peninjauan";
        }
      }

      if (opSuccess) {
        result.succeeded += 1;
        // Broadcast real-time SSE notification
        broadcastEditorialUpdate({
          id: item.id,
          title: item.title,
          module: resolvedModule,
          module_label:
            resolvedModule === "knowledge"
              ? "Pengetahuan"
              : resolvedModule === "news"
              ? "Berita"
              : resolvedModule === "announcements"
              ? "Pengumuman"
              : "Antrean Peninjauan",
          action: action === "approve" ? "approved" : action === "publish" ? "published" : "draft",
          action_label: action === "approve" ? "Disetujui" : action === "publish" ? "Terbit" : "Draf",
          reviewer_name: session.user?.name || "Administrator",
          reviewer_notes: `Operasi massal: ${action}`,
          deep_link: `/dashboard/${resolvedModule === "review-queue" ? "review-queue" : resolvedModule}/${item.id}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        result.failed += 1;
        result.errors.push({
          id: item.id,
          title: item.title,
          error: errorDetail,
        });
      }
    } catch (err: any) {
      result.failed += 1;
      result.errors.push({
        id: item.id,
        title: item.title,
        error: err.message || "Kesalahan internal server saat mengeksekusi aksi",
      });
    }
  }

  // Revalidate relevant paths
  revalidatePath("/dashboard/knowledge");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard/review-queue");
  revalidatePath("/dashboard/statistics");

  return result;
}
