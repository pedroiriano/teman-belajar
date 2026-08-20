import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kcAdminFetch } from "@/lib/keycloak-admin";
import { isProductRole, KeycloakRole } from "@/types/user";

function parseProductRoleNames(candidate: unknown): string[] | null {
  if (!Array.isArray(candidate)) return null;
  const roles = new Set<string>();
  for (const value of candidate) {
    if (typeof value !== "object" || value === null) return null;
    const role = value as { id?: unknown; name?: unknown };
    if (typeof role.name !== "string" || !isProductRole(role.name)) return null;
    roles.add(role.name);
  }
  return [...roles];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const res = await kcAdminFetch(`/users/${id}/role-mappings/realm`);
    if (!res.ok) return NextResponse.json({ error: "Role provider unavailable" }, { status: 502 });
    const roles = (await res.json()) as KeycloakRole[];
    return NextResponse.json(roles.filter((role) => isProductRole(role.name)));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const roleNames = parseProductRoleNames(await req.json());
    if (!roleNames) return NextResponse.json({ error: "Only canonical product roles may be assigned" }, { status: 422 });
    const availableRes = await kcAdminFetch(`/users/${id}/role-mappings/realm/available`);
    if (!availableRes.ok) return NextResponse.json({ error: "Role provider unavailable" }, { status: 502 });
    const availableRoles = (await availableRes.json()) as KeycloakRole[];
    const body = availableRoles.filter((role) => isProductRole(role.name) && roleNames.includes(role.name));
    if (body.length !== roleNames.length) {
      return NextResponse.json({ error: "Requested product role is unavailable" }, { status: 422 });
    }
    const res = await kcAdminFetch(`/users/${id}/role-mappings/realm`, { 
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: "Role provider rejected the assignment" }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const roleNames = parseProductRoleNames(await req.json());
    if (!roleNames) return NextResponse.json({ error: "Only canonical product roles may be removed" }, { status: 422 });
    const currentRes = await kcAdminFetch(`/users/${id}/role-mappings/realm`);
    if (!currentRes.ok) return NextResponse.json({ error: "Role provider unavailable" }, { status: 502 });
    const currentRoles = (await currentRes.json()) as KeycloakRole[];
    const body = currentRoles.filter((role) => isProductRole(role.name) && roleNames.includes(role.name));
    if (body.length !== roleNames.length) {
      return NextResponse.json({ error: "Requested product role is not assigned" }, { status: 422 });
    }
    const res = await kcAdminFetch(`/users/${id}/role-mappings/realm`, { 
      method: "DELETE",
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: "Role provider rejected the removal" }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
