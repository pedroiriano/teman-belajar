import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getReviewQueueItemsAction,
  transitionReviewItemAction,
} from "@/app/actions/review-queue";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleFilter = searchParams.get("module") || undefined;
  const statusFilter = searchParams.get("status") || undefined;

  const result = await getReviewQueueItemsAction(moduleFilter, statusFilter);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Gagal memuat antrean peninjauan" },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json({ data: result.data, roles: result.roles });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, module, targetStatus, reviewerNotes } = body;

    if (!id || !module || !targetStatus) {
      return NextResponse.json(
        { error: "Field 'id', 'module', dan 'targetStatus' wajib diisi." },
        { status: 400 }
      );
    }

    const result = await transitionReviewItemAction({
      id,
      module,
      targetStatus,
      reviewerNotes,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal mengubah status peninjauan." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json(
      { error: "Format request body tidak valid." },
      { status: 400 }
    );
  }
}
