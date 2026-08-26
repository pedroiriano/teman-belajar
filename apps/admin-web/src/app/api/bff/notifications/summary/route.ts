import { NextRequest } from "next/server";
import { proxyAdminNotification } from "@/lib/notifications/proxy";
export async function GET(request: NextRequest) { return proxyAdminNotification(request, "summary"); }
