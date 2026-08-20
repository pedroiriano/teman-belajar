import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kcAdminFetch } from "@/lib/keycloak-admin";

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const res = await kcAdminFetch(`/roles`);
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const allRoles = await res.json();
    
    // Filter out internal roles
    const internalRoles = ["uma_authorization", "offline_access"];
    const filteredRoles = allRoles.filter((r: any) => !internalRoles.includes(r.name) && !r.name.startsWith("default-roles-"));
    
    return NextResponse.json(filteredRoles);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
