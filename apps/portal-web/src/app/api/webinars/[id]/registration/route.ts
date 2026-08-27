import { NextRequest, NextResponse } from "next/server";

import { getBackendAccessToken } from "@/lib/server-auth";

const idPattern = /^[1-9][0-9]*$/;
const keyPattern = /^[A-Za-z0-9._:-]{8,64}$/;

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}

function sameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const value = new URL(origin);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return value.host.toLowerCase() === host.toLowerCase() && (!protocol || value.protocol === `${protocol}:`);
  } catch { return false; }
}

async function proxy(request: NextRequest, params: Promise<{ id: string }>, method: "POST" | "DELETE") {
  if (!sameOrigin(request)) return problem(403, "Akses ditolak", "Perubahan lintas situs tidak diizinkan");
  const { id } = await params;
  const key = request.headers.get("idempotency-key") || "";
  if (!idPattern.test(id) || !keyPattern.test(key)) return problem(422, "Permintaan tidak valid", "ID webinar atau kunci idempotensi tidak valid");
  const token = await getBackendAccessToken();
  if (!token) return problem(401, "Sesi berakhir", "Silakan masuk kembali");
  const base = process.env.PORTAL_API_INTERNAL_URL;
  if (!base) return problem(503, "Layanan belum tersedia", "Adapter webinar belum dikonfigurasi");
  try {
    const response = await fetch(`${base}/api/v1/webinars/${id}/registrations`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) return problem(502, "Respons tidak valid", "Adapter webinar mengembalikan respons yang tidak dikenal");
    return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
  } catch { return problem(503, "Layanan belum tersedia", "Adapter webinar sementara tidak dapat dijangkau"); }
}

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxy(request, params, "POST"); }
export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxy(request, params, "DELETE"); }
