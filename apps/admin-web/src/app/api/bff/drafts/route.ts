import { NextRequest } from "next/server";

import { proxyDraftRequest } from "@/lib/draft-bff";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams;
  const allowed = new URLSearchParams();
  for (const key of ["form_key", "entity_type", "entity_id"]) {
    const value = query.get(key);
    if (value) allowed.set(key, value);
  }
  return proxyDraftRequest(request, `/api/v1/admin/form-drafts?${allowed.toString()}`);
}
