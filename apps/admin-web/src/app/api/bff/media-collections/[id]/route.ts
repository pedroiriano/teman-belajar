import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";
const API = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
async function proxy(request: NextRequest, context: { params: Promise<{ id: string }> }, method: "GET" | "PATCH") {
  const token = await getServerAccessToken(); if (!token) return NextResponse.json({ title: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ title: "ID tidak valid" }, { status: 400 });
  try { const length=Number(request.headers.get("content-length")||0);if(length>131072)return NextResponse.json({title:"Payload terlalu besar"},{status:413});const body=method==="PATCH"?await request.text():undefined;const upstream=await fetch(`${API}/api/v1/admin/media-collections/${encodeURIComponent(id)}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body,cache:"no-store",signal:AbortSignal.timeout(8_000)});return new NextResponse(await upstream.text(),{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type")||"application/json","Cache-Control":"private, no-store"}}); } catch { return NextResponse.json({title:"Galeri media belum tersedia"},{status:503}); }
}
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { return proxy(request,context,"GET"); }
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { return proxy(request,context,"PATCH"); }
