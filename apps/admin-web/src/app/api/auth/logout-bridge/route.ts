import { NextRequest, NextResponse } from "next/server";

import { expireNextAuthCookies } from "@/lib/auth-cookies";
import { validateWebLogoutBridgeRequest } from "@/lib/logout-bridge";

export async function GET(req: NextRequest) {
  try {
    const portalBaseUrl = process.env.PORTAL_PUBLIC_BASE_URL;
    if (!portalBaseUrl) throw new Error("PORTAL_PUBLIC_BASE_URL is required.");

    const expectedFinalReturnUrl = new URL("/api/auth/federated-logout", portalBaseUrl);
    expectedFinalReturnUrl.searchParams.set("bridge", "1");
    const nextHop = validateWebLogoutBridgeRequest(req.nextUrl, expectedFinalReturnUrl);
    if (!nextHop) {
      return NextResponse.json({ error: "Invalid or expired logout bridge request." }, { status: 400 });
    }

    const response = expireNextAuthCookies(req, NextResponse.redirect(nextHop, { status: 303 }));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Logout bridge is not configured securely." }, { status: 503 });
  }
}
