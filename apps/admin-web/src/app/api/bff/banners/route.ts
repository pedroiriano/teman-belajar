import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

const API = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export async function GET(request: NextRequest) {
  const token = await getServerAccessToken();
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });

  try {
    const query = new URL(request.url).search;
    const upstream = await fetch(`${API}/api/v1/admin/banners${query}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ title: "Layanan banner sedang tidak dapat diakses" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getServerAccessToken();
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });

  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 131072) {
      return NextResponse.json({ title: "Payload terlalu besar" }, { status: 413 });
    }

    const body = await request.text();
    const upstream = await fetch(`${API}/api/v1/admin/banners`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ title: "Layanan banner sedang tidak dapat diakses" }, { status: 503 });
  }
}
