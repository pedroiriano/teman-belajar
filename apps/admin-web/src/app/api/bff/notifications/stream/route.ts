import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notificationStreamHub } from "@/lib/notifications/stream-hub";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", detail: "Sesi terverifikasi diperlukan" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  }

  const userEmail = session.user?.email || undefined;
  const clientId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      notificationStreamHub.addClient(clientId, controller, encoder, userEmail);

      // Send initial handshake
      const initialPayload = `event: connected\ndata: ${JSON.stringify({
        status: "connected",
        client_id: clientId,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      try {
        controller.enqueue(encoder.encode(initialPayload));
      } catch {
        notificationStreamHub.removeClient(clientId);
      }
    },
    cancel() {
      notificationStreamHub.removeClient(clientId);
    },
  });

  // Handle client abort/disconnect
  request.signal.addEventListener("abort", () => {
    notificationStreamHub.removeClient(clientId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
