import { NextRequest } from "next/server";
import { proxyLearningRequest } from "@/lib/learning/proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const p = await params;
  return proxyLearningRequest(req, p.courseId, "grades");
}
