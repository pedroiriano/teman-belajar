import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerAccessToken } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://localhost:8080";
    
    const cookieStore = await cookies();
    const visitorCookie = cookieStore.get("analytics_visitor_id");
    const accessToken = await getServerAccessToken();

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (visitorCookie) {
      headers["Cookie"] = `analytics_visitor_id=${visitorCookie.value}`;
    }
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    fetchOptions.headers = headers;

    const res = await fetch(`${apiUrl}/api/v1/analytics/events`, fetchOptions);

    const resCookies = res.headers.get("set-cookie");
    const response = new NextResponse(null, { status: res.status });
    if (resCookies) {
      response.headers.set("set-cookie", resCookies);
    }
    return response;
  } catch (error) {
    console.error("Analytics proxy error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
