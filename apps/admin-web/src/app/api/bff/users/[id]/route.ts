import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kcAdminFetch } from "@/lib/keycloak-admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const res = await kcAdminFetch(`/users/${id}`);
    if (!res.ok) return NextResponse.json({ error: `Keycloak fetch failed with status ${res.status}` }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const res = await kcAdminFetch(`/users/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
    if (!res.ok) return NextResponse.json({ error: `Keycloak fetch failed with status ${res.status}` }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
