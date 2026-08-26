import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const accessToken = await getServerAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
    const backendUrl = `${internalApiUrl}/api/v1/admin/media`;

    const policyRes = await fetch(`${backendUrl}/policy`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const policyPayload = await policyRes.json().catch(() => ({}));
    if (!policyRes.ok) return NextResponse.json(policyPayload, { status: policyRes.status });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > Number(policyPayload.data?.max_multipart_bytes || 0)) {
      return NextResponse.json({ type: "about:blank", title: "Permintaan terlalu besar", status: 413, detail: "Unggahan melebihi batas ukuran permintaan media" }, { status: 413 });
    }
    const contentType = req.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data;")) return NextResponse.json({ title: "Permintaan multipart tidak valid" }, { status: 400 });
    const requestInit: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType },
      body: req.body,
      duplex: "half",
    };
    const backendRes = await fetch(backendUrl, requestInit);

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
    const accessToken = await getServerAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internalApiUrl = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";
    
    // Pass along search params
    const { searchParams } = new URL(req.url);
    const backendUrl = `${internalApiUrl}/api/v1/admin/media?${searchParams.toString()}`;

    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
