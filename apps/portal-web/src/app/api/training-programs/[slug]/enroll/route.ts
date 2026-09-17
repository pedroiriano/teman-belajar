import { NextResponse } from "next/server";
import { getBackendAccessToken } from "@/lib/server-auth";

function apiBase() {
  return process.env.PORTAL_API_INTERNAL_URL;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [base, token] = [apiBase(), await getBackendAccessToken()];
  if (!base) {
    return NextResponse.json({ error: "Portal API base unavailable" }, { status: 503 });
  }
  if (!token) {
    return NextResponse.json({ authenticated: false, data: null }, { status: 200 });
  }

  try {
    const res = await fetch(
      `${base}/api/v1/learning/me/training-programs/${encodeURIComponent(slug)}/enrollment-status`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    const data = await res.json();
    return NextResponse.json({ authenticated: true, data }, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch enrollment status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [base, token] = [apiBase(), await getBackendAccessToken()];
  if (!base) {
    return NextResponse.json({ error: "Portal API base unavailable" }, { status: 503 });
  }
  if (!token) {
    return NextResponse.json({ error: "Unauthorized. Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(
      `${base}/api/v1/learning/me/training-programs/${encodeURIComponent(slug)}/enroll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply for training enrollment" },
      { status: 500 }
    );
  }
}
