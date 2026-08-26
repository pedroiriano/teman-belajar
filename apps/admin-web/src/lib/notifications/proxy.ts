import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

const allowedPaths = new Set(["inbox", "summary", "read-all", "preferences"]);
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eventTypes = new Set(["learning.reminder", "learning.course_updated", "learning.course_completed", "content.workflow", "system.notice"]);

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}

function sameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host.toLowerCase() === (request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.nextUrl.host).toLowerCase(); } catch { return false; }
}

export async function proxyAdminNotification(request: NextRequest, target: string, value?: string) {
  if (!allowedPaths.has(target) || (target === "inbox" && value && !idPattern.test(value)) || (target === "preferences" && value && !eventTypes.has(value))) return problem(422, "Permintaan tidak valid", "Target notifikasi tidak valid");
  if (request.method !== "GET" && !sameOrigin(request)) return problem(403, "Akses ditolak", "Perubahan lintas situs tidak diizinkan");
  const token = await getServerAccessToken();
  if (!token) return problem(401, "Sesi berakhir", "Silakan masuk kembali");
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) return problem(503, "Layanan belum tersedia", "Pusat notifikasi belum dikonfigurasi");

  const query = new URLSearchParams({ audience: "admin" });
  if (target === "inbox") for (const key of ["page", "page_size", "status"]) { const item = request.nextUrl.searchParams.get(key); if (item) query.set(key, item); }
  const path = target === "inbox" ? (value ? `/api/v1/me/notifications/${value}/read` : "/api/v1/me/notifications") : target === "summary" ? "/api/v1/me/notifications/summary" : target === "read-all" ? "/api/v1/me/notifications/read-all" : value ? `/api/v1/me/notification-preferences/${value}` : "/api/v1/me/notification-preferences";
  const body = request.method === "PUT" ? await request.text() : undefined;
  try {
    const upstream = await fetch(`${apiBase}${path}?${query}`, { method: request.method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("json")) return problem(502, "Respons tidak valid", "Pusat notifikasi mengembalikan respons yang tidak dikenal");
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
  } catch { return problem(503, "Layanan belum tersedia", "Pusat notifikasi untuk sementara tidak dapat dijangkau"); }
}
