import "server-only";

import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const maximumDraftRequestBytes = 278_528;
const allowedTopLevelFields = new Set([
  "form_key", "entity_type", "entity_id", "schema_version", "payload",
  "base_entity_version", "expected_revision", "client_updated_at",
]);

function hasDraftWriterRole(roles: string[]) {
  return roles.includes("Portal Administrator") || roles.includes("Content Editor");
}

export async function proxyDraftRequest(request: NextRequest, backendPath: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 });
  }
  if (!hasDraftWriterRole(session.roles ?? [])) {
    return NextResponse.json({ title: "Forbidden", status: 403, code: "DRAFT_WRITE_FORBIDDEN" }, { status: 403 });
  }
  const accessToken = await getServerAccessToken();
  if (!accessToken) {
    return NextResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 });
  }
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!apiBase) {
    return NextResponse.json({ title: "Service unavailable", status: 503 }, { status: 503 });
  }

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();
  headers.set("X-Request-ID", requestId);
  let body: string | undefined;
  if (request.method === "PUT") {
    body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumDraftRequestBytes) {
      return NextResponse.json({ title: "Validation failed", status: 422, code: "DRAFT_VALIDATION_FAILED", detail: "Draft request exceeds the maximum size" }, { status: 422 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return NextResponse.json({ title: "Validation failed", status: 422, code: "DRAFT_VALIDATION_FAILED", detail: "Invalid JSON request" }, { status: 422 });
    }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return NextResponse.json({ title: "Validation failed", status: 422, code: "DRAFT_VALIDATION_FAILED", detail: "Draft request must be an object" }, { status: 422 });
    }
    if (Object.keys(parsed).some((key) => !allowedTopLevelFields.has(key))) {
      return NextResponse.json({ title: "Validation failed", status: 422, code: "DRAFT_VALIDATION_FAILED", detail: "Draft request contains unknown fields" }, { status: 422 });
    }
    headers.set("Content-Type", "application/json");
  }

  const backendResponse = await fetch(`${apiBase}${backendPath}`, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });
  const responseBody = backendResponse.status === 204 ? null : await backendResponse.text();
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "X-Request-ID": backendResponse.headers.get("X-Request-ID") ?? requestId,
  });
  if (responseBody !== null) {
    responseHeaders.set("Content-Type", backendResponse.headers.get("Content-Type") ?? "application/json");
  }
  return new NextResponse(responseBody, { status: backendResponse.status, headers: responseHeaders });
}
