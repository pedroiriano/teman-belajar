import { NextRequest } from "next/server";
import { proxyAdminNotification } from "@/lib/notifications/proxy";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { return proxyAdminNotification(request, "inbox", (await context.params).id); }
