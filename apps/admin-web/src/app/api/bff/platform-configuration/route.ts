import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function GET() {
  const token = await getServerAccessToken();
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  try {
    const upstream = await fetch(`${process.env.PORTAL_API_INTERNAL_URL || "http://api:8080"}/api/v1/admin/platform-configuration`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ title: "Konfigurasi belum tersedia" }, { status: 503 }); }
}
