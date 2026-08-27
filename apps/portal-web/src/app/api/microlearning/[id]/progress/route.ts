import { NextRequest, NextResponse } from "next/server";
import { getBackendAccessToken } from "@/lib/server-auth";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxProgressBodyBytes = 4096;

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}

function isSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originURL = new URL(origin);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return originURL.host.toLowerCase() === host.toLowerCase() && (!protocol || originURL.protocol === `${protocol}:`);
  } catch {
    return false;
  }
}

async function boundedBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declaredLength) || declaredLength > maxProgressBodyBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxProgressBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return problem(403, "Forbidden", "Cross-site progress writes are not allowed");
  const { id } = await params;
  if (!idPattern.test(id)) return problem(422, "Validation Error", "Microlearning item ID is invalid");
  const body = await boundedBody(request);
  if (body === null) return problem(413, "Payload Too Large", "Progress request is too large");
  const token = await getBackendAccessToken();
  if (!token) return problem(401, "Unauthorized", "Sign in is required");
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return problem(503, "Service Unavailable", "Microlearning service is not configured");
  try {
    const response = await fetch(`${apiBase}/api/v1/me/microlearning/${id.toLowerCase()}/progress`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) return problem(502, "Bad Gateway", "Microlearning service returned an invalid response");
    return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
  } catch {
    return problem(503, "Service Unavailable", "Microlearning service is temporarily unavailable");
  }
}
