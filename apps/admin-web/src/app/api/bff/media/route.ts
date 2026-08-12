import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Proxy the request to the internal API
    const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
    const backendUrl = `${internalApiUrl}/api/v1/admin/media`;

    const formData = await req.formData();
    
    // We could just pass the formData to fetch, fetch will automatically set the 
    // boundary in the Content-Type header.
    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: formData,
    });

    const data = await backendRes.text();
    return new NextResponse(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
    
    // Pass along search params
    const { searchParams } = new URL(req.url);
    const backendUrl = `${internalApiUrl}/api/v1/admin/media?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await backendRes.text();
    return new NextResponse(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Media list proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
