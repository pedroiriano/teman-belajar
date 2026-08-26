import { NextRequest } from "next/server";
import { proxyAdminNotification } from "@/lib/notifications/proxy";
export async function POST(request: NextRequest) { return proxyAdminNotification(request, "read-all"); }
