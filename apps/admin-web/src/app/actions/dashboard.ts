"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import type { DashboardSummaryResponse } from "@/types/dashboard";

export type DashboardSummaryResult =
  | { success: true; data: DashboardSummaryResponse }
  | { success: false; error: string; status?: number };

export async function getDashboardSummaryAction(): Promise<DashboardSummaryResult> {
  const session = await getServerSession(authOptions);
  const token = await getServerAccessToken();

  if (!session || !token) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
  try {
    const response = await fetch(`${apiBase}/api/v1/admin/dashboard/summary`, {
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

    const data: DashboardSummaryResponse = await response.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Gagal memuat ringkasan dashboard" };
  }
}
