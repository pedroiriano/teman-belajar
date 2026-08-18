import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * proxyLearningRequest forwards a request to the internal Portal API securely.
 * It enforces that the courseId is a positive integer, acquires the server-side
 * Keycloak token, handles missing internal configuration, and ensures that all 
 * upstream errors are wrapped in RFC 7807 Problem Details to avoid leaking raw text.
 */
export async function proxyLearningRequest(
  req: NextRequest,
  courseId: string,
  endpointSuffix: string
) {
  // 1. Validate courseId strictly (positive integer only)
  const idNum = parseInt(courseId, 10);
  if (isNaN(idNum) || idNum <= 0 || idNum.toString() !== courseId) {
    return NextResponse.json(
      {
        type: "https://temanbelajar.com/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid course ID format",
      },
      {
        status: 400,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }

  // 2. Server-side token acquisition
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

  const apiUrl = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiUrl) {
    console.error("proxyLearningRequest: PORTAL_API_INTERNAL_URL is not set");
    return NextResponse.json(
      {
        type: "https://temanbelajar.com/errors/internal-server-error",
        title: "Internal Server Error",
        status: 500,
        detail: "System configuration error",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }

  // 3. Upstream fetch
  try {
    const upstreamUrl = `${apiUrl}/api/v1/learning/me/courses/${idNum}/${endpointSuffix}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
      cache: "no-store",
    });

    // 4. Safe JSON parsing with fallback
    let data;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType && contentType.includes("application/problem+json")) {
      data = await response.json();
    } else {
      // Non-JSON upstream response, prevent raw text leakage
      console.error(`proxyLearningRequest: Unexpected non-JSON response from ${upstreamUrl}. Status: ${response.status}, Content-Type: ${contentType}`);
      return NextResponse.json(
        {
          type: "https://temanbelajar.com/errors/bad-gateway",
          title: "Bad Gateway",
          status: 502,
          detail: "Received invalid response from upstream learning service",
        },
        {
          status: 502,
          headers: {
            "Content-Type": "application/problem+json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Preserve semantic response content type
    const resContentType = response.status >= 400 ? "application/problem+json" : "application/json";

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Content-Type": resContentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("proxyLearningRequest fetch error:", error);
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
