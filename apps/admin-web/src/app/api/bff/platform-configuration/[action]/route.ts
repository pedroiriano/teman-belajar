import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

const actions = { preview: { method: "GET", upstream: "preview" }, draft: { method: "PUT", upstream: "draft" }, publish: { method: "POST", upstream: "publish" }, rollback: { method: "POST", upstream: "rollback" } } as const;

async function proxy(request: NextRequest, context: { params: Promise<{ action: string }> }, method: "GET" | "PUT" | "POST") {
  const { action } = await context.params;
  const target = actions[action as keyof typeof actions];
  if (!target || target.method !== method) return NextResponse.json({ title: "Not Found" }, { status: 404 });
  const token = await getServerAccessToken();
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  let body: string | undefined;
  if (method !== "GET") {
    body = await request.text();
    if (body.length > 66_560) return NextResponse.json({ title: "Payload terlalu besar" }, { status: 413 });
  }
  try {
    const upstream = await fetch(`${process.env.PORTAL_API_INTERNAL_URL || "http://api:8080"}/api/v1/admin/platform-configuration/${target.upstream}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  } catch { return NextResponse.json({ title: "Konfigurasi belum tersedia" }, { status: 503 }); }
}

export function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) { return proxy(request, context, "GET"); }
export function PUT(request: NextRequest, context: { params: Promise<{ action: string }> }) { return proxy(request, context, "PUT"); }
export function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) { return proxy(request, context, "POST"); }
