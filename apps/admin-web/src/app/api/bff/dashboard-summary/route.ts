import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function GET() {
  const token = await getServerAccessToken();
  if (!token) {
    return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  }

  const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
  try {
    const upstream = await fetch(`${apiBase}/api/v1/admin/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { title: "Dashboard summary tidak tersedia" },
      { status: 503 }
    );
  }
}
