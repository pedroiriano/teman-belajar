"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type { WorkflowItem, WorkflowResponse } from "@/types/workflow";

export type WorkflowResult =
  | { success: true; data: WorkflowItem[] }
  | { success: false; error: string; status?: number };

export async function getWorkflowItemsAction(
  moduleFilter?: string,
  statusFilter?: string
): Promise<WorkflowResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const params = new URLSearchParams();
  if (moduleFilter && moduleFilter !== "all") params.set("module", moduleFilter);
  if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
  params.set("limit", "200");

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

    const payload: WorkflowResponse = await response.json();
    return { success: true, data: payload.data || [] };
  } catch {
    return { success: false, error: "Gagal memuat item alur kerja" };
  }
}
