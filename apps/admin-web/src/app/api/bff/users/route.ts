import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kcAdminFetch } from "@/lib/keycloak-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden: Portal Administrator only" }, { status: 403 });
  }

  try {
    const res = await kcAdminFetch('/users?max=100');
    if (!res.ok) {
      return NextResponse.json({ error: `Keycloak fetch failed with status ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
