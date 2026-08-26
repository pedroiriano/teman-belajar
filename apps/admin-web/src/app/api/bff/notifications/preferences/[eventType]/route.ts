import { NextRequest } from "next/server";
import { proxyAdminNotification } from "@/lib/notifications/proxy";
export async function PUT(request: NextRequest, context: { params: Promise<{ eventType: string }> }) { return proxyAdminNotification(request, "preferences", (await context.params).eventType); }
