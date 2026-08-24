import { NextRequest } from "next/server";

import { proxyDraftRequest } from "@/lib/draft-bff";

interface RouteContext { params: Promise<{ draftKey: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { draftKey } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(draftKey)) return new Response(null, { status: 404 });
  return proxyDraftRequest(request, `/api/v1/admin/form-drafts/${draftKey}/recovered`);
}
