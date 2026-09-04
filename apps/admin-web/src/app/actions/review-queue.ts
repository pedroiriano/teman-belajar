"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { transitionKnowledgeAction } from "@/app/actions/knowledge";
import { transitionNewsAction, transitionAnnouncementAction } from "@/app/actions/cms";
import { transitionFAQAction } from "@/app/actions/faq";
import { transitionTrainingProgramAction } from "@/app/actions/training-programs";
import { transitionMicrolearningAction } from "@/app/actions/microlearning";
import { transitionLearningPathAction } from "@/app/actions/learning-paths";
import {
  ReviewQueueItem,
  TransitionReviewPayload,
  TransitionReviewResult,
  reviewModuleLabels,
  reviewModuleHrefs,
} from "@/types/review-queue";
import { notificationStreamHub } from "@/lib/notifications/stream-hub";

export interface ReviewQueueResult {
  success: boolean;
  data?: ReviewQueueItem[];
  roles?: string[];
  error?: string;
  status?: number;
}

export async function getReviewQueueItemsAction(
  moduleFilter?: string,
  statusFilter?: string
): Promise<ReviewQueueResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const params = new URLSearchParams();
  if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
  if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
  params.set("limit", "250");

  const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
  try {
    const response = await fetch(`${apiBase}/api/v1/admin/workflow?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      return {
        success: false,
        error: problem.detail || problem.title || `Error ${response.status}`,
        status: response.status,
      };
    }

    const payload = await response.json();
    return {
      success: true,
      data: payload.data || [],
      roles: (session as { roles?: string[] }).roles || [],
    };
  } catch {
    return { success: false, error: "Gagal memuat data antrean peninjauan" };
  }
}

export async function transitionReviewItemAction(
  payload: TransitionReviewPayload
): Promise<TransitionReviewResult> {
  const session = await getServerSession(authOptions);
  const roles = (session as { roles?: string[] })?.roles || [];
  const canReview = roles.some((r) =>
    ["Portal Administrator", "Reviewer"].includes(r)
  );

  if (!canReview) {
    return {
      success: false,
      error: "Hanya peran Reviewer atau Portal Administrator yang berwenang mengubah status peninjauan.",
    };
  }

  const { id, module, targetStatus, reviewerNotes } = payload;
  let result: { success: boolean; error?: string } = {
    success: false,
    error: `Modul '${module}' belum didukung.`,
  };

  try {
    switch (module) {
      case "knowledge":
        result = await transitionKnowledgeAction(id, targetStatus);
        break;
      case "news":
        result = await transitionNewsAction(id, targetStatus);
        break;
      case "announcements":
        result = await transitionAnnouncementAction(id, targetStatus);
        break;
      case "faqs":
        result = await transitionFAQAction(id, targetStatus as any);
        break;
      case "training":
        result = await transitionTrainingProgramAction(id, targetStatus as any);
        break;
      case "microlearning":
        result = await transitionMicrolearningAction(id, targetStatus as any);
        break;
      case "learning_paths":
        result = await transitionLearningPathAction(id, targetStatus as any);
        break;
      default:
        return { success: false, error: `Modul '${module}' tidak dikenali.` };
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Gagal memperbarui status peninjauan.",
      };
    }

    // Persist reviewer notes to database if provided
    if (reviewerNotes && reviewerNotes.trim().length > 0) {
      const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
      const token = await getServerAccessToken();
      if (token) {
        try {
          await fetch(`${apiBase}/api/v1/admin/review-notes`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity_type: module,
              entity_id: id,
              action: targetStatus === "draft" ? "request_changes" : targetStatus,
              notes: reviewerNotes.trim(),
              reviewer_name: session?.user?.name || "Reviewer",
            }),
          });
        } catch {
          // Non-blocking error
        }
      }
    }

    // Revalidate paths
    revalidatePath("/dashboard/review-queue");
    revalidatePath("/dashboard/workflow");
    revalidatePath("/dashboard");

    // Broadcast real-time editorial notification
    const moduleLabel = reviewModuleLabels[module] || module;
    const actionType =
      targetStatus === "approved"
        ? "approved"
        : targetStatus === "published"
          ? "published"
          : "draft";
    const actionLabel =
      targetStatus === "approved"
        ? "Disetujui"
        : targetStatus === "published"
          ? "Diterbitkan"
          : "Dikembalikan ke Draf";
    const hrefFn = reviewModuleHrefs[module];
    const deepLink = hrefFn ? hrefFn(id) : "/dashboard/review-queue";

    try {
      notificationStreamHub.broadcastEditorialUpdate({
        id,
        title: payload.title || "Konten Editorial",
        module,
        module_label: moduleLabel,
        action: actionType,
        action_label: actionLabel,
        reviewer_name: session?.user?.name || undefined,
        reviewer_notes: reviewerNotes || undefined,
        deep_link: deepLink,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking broadcast
    }

    return {
      success: true,
      data: {
        id,
        module,
        previousStatus: "in_review",
        newStatus: targetStatus,
        updatedAt: new Date().toISOString(),
        reviewerNotes,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal saat mutasi status.",
    };
  }
}
