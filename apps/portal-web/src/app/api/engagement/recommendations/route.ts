import { NextRequest, NextResponse } from "next/server";
import { getBackendAccessToken } from "@/lib/server-auth";
import { proxyEngagementRequest } from "@/lib/engagement/proxy";

export async function GET(request: NextRequest) {
  const token = await getBackendAccessToken();
  if (token) {
    return proxyEngagementRequest(request, "/api/v1/me/recommendations?limit=6&content_type=knowledge");
  }

  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) {
    return NextResponse.json({ data: [], personalized: false });
  }

  try {
    const res = await fetch(`${apiBase}/api/v1/recommendations?limit=6&content_type=knowledge`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ data: [], personalized: false });
    }
    const payload = await res.json();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ data: [], personalized: false });
  }
}
