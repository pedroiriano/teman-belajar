import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kcAdminFetch } from "@/lib/keycloak-admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const res = await kcAdminFetch(`/users/${id}`);
    if (!res.ok) return NextResponse.json({ error: `Keycloak fetch failed with status ${res.status}` }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
	if (!/^[0-9a-f-]{36}$/i.test(id)) {
	  return NextResponse.json({ error: "Invalid user identifier" }, { status: 422 });
	}
	const candidate: unknown = await req.json();
	if (typeof candidate !== "object" || candidate === null ||
		Object.keys(candidate).some((key) => key !== "enabled") ||
		typeof (candidate as { enabled?: unknown }).enabled !== "boolean") {
	  return NextResponse.json({ error: "Only the enabled Boolean field is accepted" }, { status: 422 });
	}
	const body = { enabled: (candidate as { enabled: boolean }).enabled };
    const res = await kcAdminFetch(`/users/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
    if (!res.ok) return NextResponse.json({ error: `Keycloak fetch failed with status ${res.status}` }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
