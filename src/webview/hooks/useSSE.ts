/**
 * useSSE Hook - Simple SSE Connection
 *
 * Connects to the backend SSE stream for real-time updates.
 * Use this to receive events from glasses and backend.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface SSEEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

export interface UseSSEReturn {
  isConnected: boolean;
  events: SSEEvent[];
  lastEvent: SSEEvent | null;
  error: string | null;
  reconnect: () => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 100;
const RECONNECT_DELAY = 3000;

export function useSSE(userId: string | null): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!userId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const url = `/api/events?userId=${encodeURIComponent(userId)}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        if (!isMountedRef.current) return;
        console.log("[SSE] Connected");
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as SSEEvent;
          setEvents((prev) => {
            const updated = [...prev, data];
            return updated.slice(-MAX_EVENTS);
          });
        } catch (err) {
          console.error("[SSE] Failed to parse event:", err);
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        console.warn("[SSE] Connection error, reconnecting...");
        setIsConnected(false);
        eventSource.close();

        // Reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, RECONNECT_DELAY);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("[SSE] Failed to connect:", err);
      setError("Failed to connect to event stream");
      setIsConnected(false);
    }
  }, [userId]);

  const reconnect = useCallback(() => {
    console.log("[SSE] Manual reconnect");
    connect();
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isMountedRef.current = true;

    if (userId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, connect]);

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    isConnected,
    events,
    lastEvent,
    error,
    reconnect,
    clearEvents,
  };
}
