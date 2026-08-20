import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PRODUCT_ROLES } from "@/types/user";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.roles?.includes("Portal Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(PRODUCT_ROLES.map((name) => ({ id: name, name })));
}
