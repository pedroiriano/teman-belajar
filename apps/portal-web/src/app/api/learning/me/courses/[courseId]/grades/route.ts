import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const p = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiUrl = process.env.PORTAL_API_INTERNAL_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { error: "API internal URL is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${apiUrl}/api/v1/learning/me/courses/${p.courseId}/grades`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
        cache: "no-store",
      }
    );

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      return new NextResponse(text, { status: response.status, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching course grades:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
