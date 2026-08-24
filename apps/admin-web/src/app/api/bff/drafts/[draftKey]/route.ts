import { NextRequest } from "next/server";

import { proxyDraftRequest } from "@/lib/draft-bff";

interface RouteContext { params: Promise<{ draftKey: string }> }

function validDraftKey(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function backendPath(request: NextRequest, context: RouteContext) {
  const { draftKey } = await context.params;
  if (!validDraftKey(draftKey)) return null;
  const reason = new URL(request.url).searchParams.get("reason");
  return `/api/v1/admin/form-drafts/${draftKey}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const path = await backendPath(request, context);
  return path ? proxyDraftRequest(request, path) : new Response(null, { status: 404 });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const path = await backendPath(request, context);
  return path ? proxyDraftRequest(request, path) : new Response(null, { status: 404 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const path = await backendPath(request, context);
  return path ? proxyDraftRequest(request, path) : new Response(null, { status: 404 });
}
