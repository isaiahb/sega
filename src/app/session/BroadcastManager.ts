/**
 * BroadcastManager
 * Manages SSE (Server-Sent Events) connections for real-time updates to web UI
 *
 * Responsibilities:
 * - Track connected SSE clients per user
 * - Broadcast events to specific users or all clients
 * - Handle heartbeats to keep connections alive
 * - Clean up disconnected clients
 */

import type { Context } from "hono";
import type { AnySSEEvent, SSEEventType } from "./types";

/** Heartbeat interval in milliseconds */
const HEARTBEAT_INTERVAL = 15000; // 15 seconds

/**
 * Represents a connected SSE client
 */
interface SSEClient {
  /** Unique client ID */
  id: string;
  /** User ID (email) this client belongs to */
  userId: string;
  /** Stream controller for sending events */
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** Heartbeat timer reference */
  heartbeatTimer?: ReturnType<typeof setInterval>;
  /** When the client connected */
  connectedAt: Date;
}

/**
 * BroadcastManager - handles SSE connections and event broadcasting
 */
export class BroadcastManager {
  /** Connected clients */
  private clients: Set<SSEClient> = new Set();

  /** User ID this manager belongs to */
  private readonly userId: string;

  /** Reference to parent for cross-user broadcasts (optional) */
  private static globalClients: Set<SSEClient> = new Set();

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Create an SSE response for a Hono route handler
   */
  createSSEResponse(c: Context): Response {
    const clientId = `${this.userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let client: SSEClient | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        client = {
          id: clientId,
          userId: this.userId,
          controller,
          connectedAt: new Date(),
        };

        // Set up heartbeat
        client.heartbeatTimer = setInterval(() => {
          this.sendHeartbeat(client!);
        }, HEARTBEAT_INTERVAL);

        // Track client
        this.clients.add(client);
        BroadcastManager.globalClients.add(client);

        // Send initial connection event
        this.sendToClient(client, {
          type: "connected",
          timestamp: Date.now(),
          clientId,
        });

        console.log(
          `[SSE] Client connected: ${clientId} (user: ${this.userId})`,
        );
        console.log(
          `[SSE] Global clients now: ${BroadcastManager.globalClients.size} total`,
        );
      },
      cancel: () => {
        if (client) {
          this.removeClient(client);
          console.log(`[SSE] Client disconnected: ${clientId}`);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  }

  /**
   * Broadcast an event to all clients for this user
   * Uses the global client registry to reach ALL clients for this userId,
   * not just the ones registered with this instance.
   */
  broadcast(event: AnySSEEvent | Record<string, unknown>): void {
    const payload = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    // Use static method to broadcast to ALL clients for this user
    // This ensures events reach clients even if they connected before the session was created
    BroadcastManager.broadcastToUser(this.userId, payload);
  }

  /**
   * Broadcast a typed event
   */
  emit<T extends SSEEventType>(
    type: T,
    data: Omit<Extract<AnySSEEvent, { type: T }>, "type" | "timestamp">,
  ): void {
    this.broadcast({
      type,
      timestamp: Date.now(),
      ...data,
    } as AnySSEEvent);
  }

  /**
   * Send transcript update
   */
  sendTranscript(text: string, isFinal: boolean, speakerHint?: string): void {
    const safeText = text || "";
    console.log(
      `[BroadcastManager] Sending transcript to user ${this.userId}: "${safeText.substring(0, 50)}..." (isFinal: ${isFinal})`,
    );
    console.log(
      `[BroadcastManager] Global clients count: ${BroadcastManager.globalClients.size}`,
    );

    // Count clients for this user
    let userClientCount = 0;
    for (const client of BroadcastManager.globalClients) {
      if (client.userId === this.userId) {
        userClientCount++;
      }
    }
    console.log(
      `[BroadcastManager] Clients for user ${this.userId}: ${userClientCount}`,
    );

    this.broadcast({
      type: "transcript",
      timestamp: Date.now(),
      text,
      isFinal,
      speakerHint,
    });
  }

  /**
   * Send meeting started event
   */
  sendMeetingStarted(
    meetingId: string,
    title: string,
    category: string,
    startTime: Date,
  ): void {
    this.broadcast({
      type: "meeting_started",
      timestamp: Date.now(),
      meetingId,
      title,
      category,
      startTime: startTime.toISOString(),
    });
  }

  /**
   * Send meeting ended event
   */
  sendMeetingEnded(meetingId: string, durationMs: number): void {
    this.broadcast({
      type: "meeting_ended",
      timestamp: Date.now(),
      meetingId,
      duration: durationMs,
    });
  }

  /**
   * Send notes ready event
   */
  sendNotesReady(
    noteId: string,
    meetingId: string,
    title: string,
    summary: string,
  ): void {
    this.broadcast({
      type: "notes_ready",
      timestamp: Date.now(),
      noteId,
      meetingId,
      title,
      summary,
    });
  }

  /**
   * Send research progress event
   */
  sendResearchProgress(
    researchId: string,
    query: string,
    progress: number,
    currentStep: string,
  ): void {
    this.broadcast({
      type: "research_progress",
      timestamp: Date.now(),
      researchId,
      query,
      progress,
      currentStep,
    });
  }

  /**
   * Send state change event
   */
  sendStateChange(previousState: string, newState: string): void {
    this.broadcast({
      type: "state_change",
      timestamp: Date.now(),
      previousState,
      newState,
    });
  }

  /**
   * Send error event
   */
  sendError(message: string, code?: string): void {
    this.broadcast({
      type: "error",
      timestamp: Date.now(),
      message,
      code,
    });
  }

  /**
   * Get count of connected clients for this user
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if user has any connected clients
   */
  hasClients(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Dispose of all client connections
   */
  dispose(): void {
    for (const client of this.clients) {
      this.removeClient(client);
    }
    this.clients.clear();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Send data to a specific client
   */
  private sendToClient(client: SSEClient, data: Record<string, unknown>): void {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Client likely disconnected, clean up
      this.removeClient(client);
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(client: SSEClient): void {
    try {
      const heartbeat = `: heartbeat ${Date.now()}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(heartbeat));
    } catch (error) {
      // Client likely disconnected, clean up
      this.removeClient(client);
    }
  }

  /**
   * Remove a client and clean up resources
   */
  private removeClient(client: SSEClient): void {
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
    }
    this.clients.delete(client);
    BroadcastManager.globalClients.delete(client);
  }

  // ===========================================================================
  // Static Methods for Cross-User Operations
  // ===========================================================================

  /**
   * Broadcast to a specific user (used by API routes)
   */
  static broadcastToUser(userId: string, data: Record<string, unknown>): void {
    const payload = {
      ...data,
      timestamp: data.timestamp || Date.now(),
    };
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const encoded = new TextEncoder().encode(message);

    // Debug: count clients for this user
    let clientCount = 0;
    let sentCount = 0;

    for (const client of BroadcastManager.globalClients) {
      if (client.userId === userId) {
        clientCount++;
        try {
          client.controller.enqueue(encoded);
          sentCount++;
        } catch {
          // Client disconnected, will be cleaned up by its manager
        }
      }
    }

    // Log broadcast info
    const eventType = (data as any).type || "unknown";
    console.log(
      `[BroadcastManager.broadcastToUser] userId=${userId} event=${eventType} globalClients=${BroadcastManager.globalClients.size} userClients=${clientCount} sent=${sentCount}`,
    );
  }

  /**
   * Broadcast to all connected clients (system-wide announcements)
   */
  static broadcastToAll(data: Record<string, unknown>): void {
    const payload = {
      ...data,
      timestamp: data.timestamp || Date.now(),
    };
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const encoded = new TextEncoder().encode(message);

    for (const client of BroadcastManager.globalClients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        // Client disconnected, will be cleaned up by its manager
      }
    }
  }

  /**
   * Get total count of all connected clients
   */
  static getGlobalClientCount(): number {
    return BroadcastManager.globalClients.size;
  }

  /**
   * Get list of all connected user IDs
   */
  static getConnectedUserIds(): string[] {
    const userIds = new Set<string>();
    for (const client of BroadcastManager.globalClients) {
      userIds.add(client.userId);
    }
    return Array.from(userIds);
  }
}
