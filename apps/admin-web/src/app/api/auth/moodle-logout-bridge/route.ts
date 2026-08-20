import { NextRequest, NextResponse } from "next/server";

import { expireNextAuthCookies } from "@/lib/auth-cookies";
import { validateMoodleInitiatedAdminBridgeRequest } from "@/lib/logout-bridge";

export async function GET(req: NextRequest) {
  try {
    const nextHop = validateMoodleInitiatedAdminBridgeRequest(req.nextUrl);
    if (!nextHop) {
      return NextResponse.json({ error: "Invalid or expired Moodle logout request." }, { status: 400 });
    }

    const response = expireNextAuthCookies(req, NextResponse.redirect(nextHop, { status: 303 }));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Moodle logout bridge is not configured securely." }, { status: 503 });
  }
}
