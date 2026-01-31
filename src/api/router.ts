/**
 * SEGA API Router
 *
 * API routes for Smart Executive Glasses Assistant.
 * Uses the new UserSession architecture for state management.
 *
 * Includes:
 * - Health check and info endpoints
 * - SSE event stream for real-time updates
 * - Meeting endpoints
 * - Transcript endpoints
 * - Settings endpoints
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { AuthVariables, createAuthMiddleware } from "@mentra/sdk";
import { UserSession, BroadcastManager } from "../app/session";

// Get config from environment
const API_KEY = process.env.MENTRAOS_API_KEY || "";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "";
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY;

export const api = new Hono<{ Variables: AuthVariables }>();

// ===========================================================================
// Auth Middleware Setup
// ===========================================================================

const authMiddleware = API_KEY
  ? createAuthMiddleware({
      apiKey: API_KEY,
      packageName: PACKAGE_NAME,
      cookieSecret: COOKIE_SECRET,
    })
  : undefined;

// Apply auth to protected routes
if (authMiddleware) {
  api.use("/me", authMiddleware);
  api.use("/transcript/*", authMiddleware);
  api.use("/meetings/*", authMiddleware);
  api.use("/settings/*", authMiddleware);
}

// ===========================================================================
// Health & Info
// ===========================================================================

api.get("/health", (c: Context) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    sseClients: BroadcastManager.getGlobalClientCount(),
    activeSessions: UserSession.getActiveSessionCount(),
  });
});

api.get("/me", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({
      authenticated: false,
      userId: null,
    });
  }

  // Get user session info if available
  const session = UserSession.get(userId);

  return c.json({
    authenticated: true,
    userId,
    hasActiveSession: !!session,
    isInMeeting: session?.meeting.isInMeeting() || false,
  });
});

// ===========================================================================
// SSE Stream - Real-time updates to frontend
// ===========================================================================

api.get("/events", (c: Context) => {
  // Get userId from query param or auth
  // @ts-ignore
  const authUserId = c.get("authUserId") as string | undefined;
  const queryUserId = c.req.query("userId");
  const userId = authUserId || queryUserId || "anonymous";

  // Get or create a BroadcastManager for this user
  const session = UserSession.get(userId);

  if (session) {
    // Use the session's broadcast manager
    return session.broadcast.createSSEResponse(c);
  }

  // For users without an active glasses session, create a standalone broadcast manager
  const broadcastManager = new BroadcastManager(userId);
  return broadcastManager.createSSEResponse(c);
});

// ===========================================================================
// Transcript Endpoints
// ===========================================================================

/**
 * Get recent transcript
 * GET /api/transcript/recent
 */
api.get("/transcript/recent", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  const count = parseInt(c.req.query("count") || "50", 10);
  const finalOnly = c.req.query("finalOnly") !== "false";

  const segments = session.transcript.getRecentSegments(count, finalOnly);

  return c.json({
    success: true,
    date: session.transcript.getCurrentDate(),
    segments,
    text: segments.map((s) => s.text).join(" "),
  });
});

/**
 * Get daily transcript
 * GET /api/transcript/daily?date=YYYY-MM-DD
 */
api.get("/transcript/daily", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  const date = c.req.query("date") || session.transcript.getCurrentDate();
  const transcript = await session.transcript.getDailyTranscript(date);

  if (!transcript) {
    return c.json({ error: "Transcript not found" }, 404);
  }

  return c.json({
    success: true,
    transcript,
  });
});

// ===========================================================================
// Meeting Endpoints
// ===========================================================================

/**
 * Get active meeting
 * GET /api/meetings/active
 */
api.get("/meetings/active", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  const meeting = session.meeting.getActiveMeeting();

  if (!meeting) {
    return c.json({
      success: true,
      active: false,
      meeting: null,
    });
  }

  return c.json({
    success: true,
    active: true,
    meeting,
    duration: session.meeting.getCurrentMeetingDuration(),
  });
});

/**
 * Get recent meetings
 * GET /api/meetings/recent
 */
api.get("/meetings/recent", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  const meetings = session.meeting.getRecentMeetings();

  return c.json({
    success: true,
    meetings,
  });
});

/**
 * Get meeting by ID
 * GET /api/meetings/:id
 */
api.get("/meetings/:id", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  const meetingId = c.req.param("id");
  const meeting = await session.meeting.getMeetingById(meetingId);

  if (!meeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  // Include transcript if requested
  const includeTranscript = c.req.query("transcript") === "true";
  let transcript: string | undefined;

  if (includeTranscript) {
    transcript = session.meeting.getMeetingTranscript(meeting);
  }

  return c.json({
    success: true,
    meeting,
    transcript,
  });
});

/**
 * End active meeting manually
 * POST /api/meetings/end
 */
api.post("/meetings/end", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  if (!session.meeting.isInMeeting()) {
    return c.json({ error: "No active meeting" }, 400);
  }

  const meeting = await session.meeting.endMeeting();

  return c.json({
    success: true,
    meeting,
  });
});

// ===========================================================================
// Settings Endpoints
// ===========================================================================

/**
 * Get user settings
 * GET /api/settings
 */
api.get("/settings", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  return c.json({
    success: true,
    settings: session.settings.getSettings(),
  });
});

/**
 * Update user settings
 * PATCH /api/settings
 */
api.patch("/settings", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  try {
    const body = await c.req.json();
    await session.settings.updateSettings(body);

    return c.json({
      success: true,
      settings: session.settings.getSettings(),
    });
  } catch (error) {
    console.error("[API] Settings update error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

/**
 * Get meeting presets
 * GET /api/settings/presets
 */
api.get("/settings/presets", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  return c.json({
    success: true,
    presets: session.settings.getPresets(),
    systemPresets: session.settings.getSystemPresets(),
    userPresets: session.settings.getUserPresets(),
  });
});

/**
 * Get sensitive topics
 * GET /api/settings/sensitive-topics
 */
api.get("/settings/sensitive-topics", async (c: Context) => {
  // @ts-ignore
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }

  return c.json({
    success: true,
    topics: session.settings.getSensitiveTopics(),
  });
});

// ===========================================================================
// 404 Handler
// ===========================================================================

api.all("*", (c: Context) => {
  return c.json(
    {
      error: "Not Found",
      path: c.req.path,
      method: c.req.method,
    },
    404
  );
});
