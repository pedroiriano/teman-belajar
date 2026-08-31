import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { auditQueryKeys } from "@/lib/audit-center";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) return NextResponse.json({ title: "Forbidden" }, { status: 403 });
  const token = await getServerAccessToken();
  if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  const query = new URLSearchParams();
  for (const key of auditQueryKeys) {
    const values = request.nextUrl.searchParams.getAll(key);
    if (values.length > 1 || (values[0]?.length || 0) > 255) return NextResponse.json({ title: "Validation Error" }, { status: 422 });
    if (values[0]) query.set(key, values[0]);
  }
  if (!query.get("from") || !query.get("to")) return NextResponse.json({ title: "Validation Error" }, { status: 422 });
  try {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-events/export?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.body) return NextResponse.json({ title: response.status === 422 ? "Validation Error" : "Audit export unavailable" }, { status: response.status });
    return new NextResponse(response.body, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="teman-belajar-audit.csv"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ title: "Audit export unavailable" }, { status: 503 }); }
}
