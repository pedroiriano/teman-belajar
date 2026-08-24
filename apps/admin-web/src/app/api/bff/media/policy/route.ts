import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function GET() {
  const token = await getServerAccessToken();
  const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL;
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  if (!internalApiUrl) return NextResponse.json({ title: "Portal API tidak dikonfigurasi" }, { status: 500 });
  const response = await fetch(`${internalApiUrl}/api/v1/admin/media/policy`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json().catch(() => ({ title: "Kebijakan media tidak tersedia" }));
  return NextResponse.json(payload, { status: response.status });
}
