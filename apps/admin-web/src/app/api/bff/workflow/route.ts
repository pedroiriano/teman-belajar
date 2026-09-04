import { type NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const token = await getServerAccessToken();
  if (!token) {
    return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const moduleParam = searchParams.get("module");
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  if (moduleParam) params.set("module", moduleParam);
  if (statusParam) params.set("status", statusParam);
  if (limitParam) params.set("limit", limitParam);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

  try {
    const upstream = await fetch(`${apiBase}/api/v1/admin/workflow${queryString}`, {
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
      { title: "Layanan alur kerja tidak tersedia" },
      { status: 503 }
    );
  }
}
