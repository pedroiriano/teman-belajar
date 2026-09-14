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
  const base = apiBase();
  if (!base) {
    return NextResponse.json({ error: "Portal API base unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const targetUrl = `${base}/api/v1/training-programs/${encodeURIComponent(slug)}/reviews${search ? `?${search}` : ""}`;

  try {
    const res = await fetch(targetUrl, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reviews" },
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(
      `${base}/api/v1/training-programs/${encodeURIComponent(slug)}/reviews`,
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
      { error: error instanceof Error ? error.message : "Failed to submit review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [base, token] = [apiBase(), await getBackendAccessToken()];
  if (!base) {
    return NextResponse.json({ error: "Portal API base unavailable" }, { status: 503 });
  }
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${base}/api/v1/training-programs/${encodeURIComponent(slug)}/reviews/my`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete review" },
      { status: 500 }
    );
  }
}
