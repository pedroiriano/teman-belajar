import { NextRequest, NextResponse } from "next/server";

import { getBackendAccessToken } from "@/lib/server-auth";

const targetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}

export function engagementTargetPath(targetType: string, targetId: string) {
  if ((targetType !== "knowledge" && targetType !== "microlearning") || !targetIdPattern.test(targetId)) return null;
  return `${targetType}/${targetId.toLowerCase()}`;
}

function isSameOriginWrite(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    if (originUrl.host.toLowerCase() !== requestHost.toLowerCase()) return false;

    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return !forwardedProtocol || originUrl.protocol === `${forwardedProtocol}:`;
  } catch {
    return false;
  }
}

export async function proxyEngagementRequest(request: NextRequest, apiPath: string, init?: { method?: "GET" | "PUT" | "DELETE"; body?: string }) {
  const method = init?.method ?? "GET";
  if (method !== "GET" && !isSameOriginWrite(request)) return problem(403, "Forbidden", "Cross-site engagement writes are not allowed");

  const token = await getBackendAccessToken();
  if (!token) return problem(401, "Unauthorized", "Sign in is required");
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return problem(503, "Service Unavailable", "Engagement service is not configured");

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return problem(503, "Service Unavailable", "Engagement service is temporarily unavailable");
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("application/problem+json")) {
    return problem(502, "Bad Gateway", "Engagement service returned an invalid response");
  }
  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}
