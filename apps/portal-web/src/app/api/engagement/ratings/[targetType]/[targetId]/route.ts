import { NextRequest } from "next/server";
import { engagementTargetPath, proxyEngagementRequest } from "@/lib/engagement/proxy";

type Params = { params: Promise<{ targetType: string; targetId: string }> };

async function targetPath(context: Params) {
  const { targetType, targetId } = await context.params;
  return engagementTargetPath(targetType, targetId);
}

export async function GET(request: NextRequest, context: Params) {
  const target = await targetPath(context);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/ratings/${target}`);
}

export async function PUT(request: NextRequest, context: Params) {
  const target = await targetPath(context);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Number.isInteger((body as { rating?: unknown }).rating)) {
    return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Rating must be an integer from 1 to 5" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  const rating = (body as { rating: number }).rating;
  if (rating < 1 || rating > 5) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Rating must be an integer from 1 to 5" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/ratings/${target}`, { method: "PUT", body: JSON.stringify({ rating }) });
}

export async function DELETE(request: NextRequest, context: Params) {
  const target = await targetPath(context);
  if (!target) return Response.json({ type: "about:blank", title: "Validation Error", status: 422, detail: "Invalid engagement target" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  return proxyEngagementRequest(request, `/api/v1/me/ratings/${target}`, { method: "DELETE" });
}
