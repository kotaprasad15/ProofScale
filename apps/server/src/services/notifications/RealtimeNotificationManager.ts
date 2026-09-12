import { Response } from "express";

export interface SseNotificationPayload {
  id: string;
  eventType: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  linkUrl?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

export class RealtimeNotificationManager {
  private static userConnections = new Map<string, Set<Response>>();

  /**
   * Registers a new SSE connection for a user.
   */
  static registerConnection(userId: string, res: Response): void {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    const connections = this.userConnections.get(userId)!;
    connections.add(res);

    res.on("close", () => {
      connections.delete(res);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    });
  }

  /**
   * Sends a real-time event to all active SSE connections for a specific user.
   */
  static sendToUser(userId: string, payload: SseNotificationPayload): void {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) return;

    const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const res of connections) {
      try {
        res.write(data);
      } catch {
        connections.delete(res);
      }
    }
  }

  /**
   * Checks if user currently has an active SSE connection.
   */
  static hasActiveConnection(userId: string): boolean {
    const connections = this.userConnections.get(userId);
    return !!connections && connections.size > 0;
  }
}
