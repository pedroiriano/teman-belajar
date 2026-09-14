import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.accessToken) {
    return NextResponse.json(
      {
        type: "https://temanbelajar.com/errors/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Missing or invalid authentication token",
      },
      {
        status: 401,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }

  const apiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://127.0.0.1:8180";
  try {
    const upstreamUrl = `${apiUrl}/api/v1/learning/me/transcript`;
    const response = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("application/problem+json")) {
      return NextResponse.json(
        {
          type: "https://temanbelajar.com/errors/bad-gateway",
          title: "Bad Gateway",
          status: 502,
          detail: "Received invalid response from upstream learning service",
        },
        {
          status: 502,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    const data = await response.json();
    const resContentType = response.status >= 400 ? "application/problem+json" : "application/json";

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": resContentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("proxy transcript request failed:", err);
    return NextResponse.json(
      {
        type: "https://temanbelajar.com/errors/gateway-timeout",
        title: "Gateway Timeout",
        status: 504,
        detail: "Failed to communicate with learning service",
      },
      {
        status: 504,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }
}
