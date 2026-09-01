import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

const API = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
async function proxy(request: NextRequest, method: "GET" | "POST") {
  const token = await getServerAccessToken(); if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  try {
    const query = method === "GET" ? new URL(request.url).search : "";
    const length = Number(request.headers.get("content-length") || 0); if (length > 131072) return NextResponse.json({ title: "Payload terlalu besar" }, { status: 413 });
    const body = method === "POST" ? await request.text() : undefined;
    const upstream = await fetch(`${API}/api/v1/admin/media-collections${query}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ title: "Galeri media belum tersedia" }, { status: 503 }); }
}
export async function GET(request: NextRequest) { return proxy(request, "GET"); }
export async function POST(request: NextRequest) { return proxy(request, "POST"); }
