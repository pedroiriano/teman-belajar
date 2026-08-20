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
    const res = await kcAdminFetch('/users?max=100');
    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = await req.json();
    const { roles, ...userPayload } = payload;
    
    const res = await kcAdminFetch('/users', { 
      method: 'POST', 
      body: JSON.stringify(userPayload) 
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const location = res.headers.get("Location") || "";
    const userId = location.split("/").pop();

    if (userId && roles && Array.isArray(roles) && roles.length > 0) {
      const allRolesRes = await kcAdminFetch("/roles");
      const allRoles = await allRolesRes.json();
      const rolesToAssign = allRoles.filter((r: any) => roles.includes(r.name));
      if (rolesToAssign.length > 0) {
        await kcAdminFetch(`/users/${userId}/role-mappings/realm`, {
          method: "POST",
          body: JSON.stringify(rolesToAssign),
        });
      }
    }
    
    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
