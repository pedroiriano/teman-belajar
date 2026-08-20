import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = await getServerAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
    const backendUrl = `${internalApiUrl}/api/v1/admin/media/${id}/content`;

    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend returned ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    // Stream the response back to the client
    const headers = new Headers();
    backendRes.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers,
    });
  } catch (error) {
    console.error("Media content proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
