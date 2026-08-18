import { NextRequest } from "next/server";
import { engagementTargetPath, proxyEngagementRequest } from "@/lib/engagement/proxy";

export async function PUT(request: NextRequest, context: { params: Promise<{ targetType: string; targetId: string }> }) {
  const { targetType, targetId } = await context.params;
  const target = engagementTargetPath(targetType, targetId);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/recent-views/${target}`, { method: "PUT" });
}
