import { NextRequest } from "next/server";
import { proxyEngagementRequest } from "@/lib/engagement/proxy";

export async function GET(request: NextRequest) {
  return proxyEngagementRequest(request, "/api/v1/me/recommendations?limit=6&content_type=knowledge");
}
