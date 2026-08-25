import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ title: "Not Found" }, { status: 404 });
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return NextResponse.json({ title: "Service Unavailable" }, { status: 503 });
  const response = await fetch(`${apiBase}/api/v1/media/${encodeURIComponent(id)}/content`, { next: { revalidate: 3600 } });
  if (!response.ok || !response.body) return NextResponse.json({ title: "Not Found" }, { status: response.status === 403 ? 404 : response.status });
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(response.body, { status: 200, headers });
}
