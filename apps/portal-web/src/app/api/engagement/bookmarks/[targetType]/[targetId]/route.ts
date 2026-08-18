import { NextRequest } from "next/server";
import { engagementTargetPath, proxyEngagementRequest } from "@/lib/engagement/proxy";

type Params = { params: Promise<{ targetType: string; targetId: string }> };

async function targetPath(context: Params) {
  const { targetType, targetId } = await context.params;
  return engagementTargetPath(targetType, targetId);
}

export async function PUT(request: NextRequest, context: Params) {
  const target = await targetPath(context);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/bookmarks/${target}`, { method: "PUT" });
}

export async function DELETE(request: NextRequest, context: Params) {
  const target = await targetPath(context);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/bookmarks/${target}`, { method: "DELETE" });
}
