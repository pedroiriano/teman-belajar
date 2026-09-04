/**
 * Notification Stream Hub — Server-Sent Events (SSE) Broadcast Hub.
 * Manages active SSE clients, sends heartbeats, and broadcasts real-time
 * editorial notifications across connected admin sessions.
 */

export interface EditorialNotificationEvent {
  id: string;
  title: string;
  module: string;
  module_label: string;
  action: "approved" | "draft" | "published";
  action_label: string;
  reviewer_name?: string;
  reviewer_notes?: string;
  deep_link: string;
  timestamp: string;
  unread_count?: number;
}

export type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  userId?: string;
};

class NotificationStreamHub {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    // Send keep-alive comment every 15 seconds to prevent proxy/socket timeouts
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  private sendHeartbeat() {
    if (this.clients.size === 0) return;
    const comment = ": heartbeat\n\n";
    this.clients.forEach((client, id) => {
      try {
        client.controller.enqueue(client.encoder.encode(comment));
      } catch {
        this.removeClient(id);
      }
    });
  }

  public addClient(
    id: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    userId?: string
  ): void {
    this.clients.set(id, { id, controller, encoder, userId });
    this.startHeartbeat();
  }

  public removeClient(id: string): void {
    this.clients.delete(id);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public broadcast(eventName: string, data: unknown): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client, id) => {
      try {
        client.controller.enqueue(client.encoder.encode(payload));
      } catch {
        this.removeClient(id);
      }
    });
  }

  public broadcastEditorialUpdate(event: EditorialNotificationEvent): void {
    this.broadcast("editorial", event);
  }

  public broadcastSummary(unreadCount: number): void {
    this.broadcast("summary", { unread_count: unreadCount });
  }
}

// Global singleton pattern to survive hot reloads in Next.js development
const globalForStream = globalThis as unknown as {
  notificationStreamHub?: NotificationStreamHub;
};

export const notificationStreamHub =
  globalForStream.notificationStreamHub ?? new NotificationStreamHub();

if (process.env.NODE_ENV !== "production") {
  globalForStream.notificationStreamHub = notificationStreamHub;
}

export function broadcastEditorialUpdate(event: EditorialNotificationEvent): void {
  notificationStreamHub.broadcastEditorialUpdate(event);
}

