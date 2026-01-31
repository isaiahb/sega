/**
 * SSE (Server-Sent Events) Utilities
 *
 * Simple SSE implementation for real-time updates to frontend.
 * Use broadcastToUser() to send events from anywhere in your backend.
 */

import type { Context } from "hono";

// Heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15000;

// Client tracking
interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  heartbeatTimer?: ReturnType<typeof setInterval>;
}

// Connected clients
const clients: Set<SSEClient> = new Set();

/**
 * Create an SSE response for a Hono route handler
 */
export function createSSEResponse(c: Context, userId: string): Response {
  const clientId = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: SSEClient = {
        id: clientId,
        userId,
        controller,
      };

      // Heartbeat to keep connection alive
      heartbeatTimer = setInterval(() => {
        try {
          const heartbeat = `: heartbeat ${Date.now()}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          clients.delete(client);
        }
      }, HEARTBEAT_INTERVAL);

      client.heartbeatTimer = heartbeatTimer;
      clients.add(client);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      console.log(`[SSE] Client connected: ${clientId}`);
    },
    cancel() {
      for (const client of clients) {
        if (client.id === clientId) {
          if (client.heartbeatTimer) clearInterval(client.heartbeatTimer);
          clients.delete(client);
          console.log(`[SSE] Client disconnected: ${clientId}`);
          break;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Broadcast an event to a specific user's connected clients
 */
export function broadcastToUser(userId: string, data: Record<string, any>): void {
  const payload = {
    ...data,
    timestamp: Date.now(),
  };
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  for (const client of clients) {
    if (client.userId === userId) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        if (client.heartbeatTimer) clearInterval(client.heartbeatTimer);
        clients.delete(client);
      }
    }
  }
}

/**
 * Broadcast an event to ALL connected clients
 */
export function broadcastToAll(data: Record<string, any>): void {
  const payload = {
    ...data,
    timestamp: Date.now(),
  };
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  for (const client of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      if (client.heartbeatTimer) clearInterval(client.heartbeatTimer);
      clients.delete(client);
    }
  }
}

/**
 * Get count of connected clients (for health checks)
 */
export function getClientCounts(): number {
  return clients.size;
}

/**
 * Get list of connected user IDs
 */
export function getConnectedUserIds(): string[] {
  const userIds = new Set<string>();
  for (const client of clients) {
    userIds.add(client.userId);
  }
  return Array.from(userIds);
}
