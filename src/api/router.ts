/**
 * SEGA API Router
 *
 * API routes for Smart Executive Glasses Assistant.
 * Uses the new UserSession architecture for state management.
 *
 * Includes:
 * - Health check and info endpoints
 * - SSE event stream for real-time updates
 * - Transcript endpoints
 * - Meeting endpoints
 * - Notes endpoints
 * - Action items endpoints
 * - Research endpoints
 * - Settings endpoints
 * - Presets endpoints
 * - Sensitive topics endpoints
 * - State endpoints
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { AuthVariables, createAuthMiddleware } from "@mentra/sdk";
import { UserSession, BroadcastManager } from "../app/session";
import {
  isDBConnected,
  Note as NoteModel,
  ActionItem as ActionItemModel,
  ResearchResult as ResearchResultModel,
  MeetingPreset as PresetModel,
  SensitiveTopic as SensitiveTopicModel,
  getOrCreateUserSettings,
  UserSettings as UserSettingsModel,
} from "../services/db";

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
  api.use("/notes/*", authMiddleware);
  api.use("/actions/*", authMiddleware);
  api.use("/research/*", authMiddleware);
  api.use("/settings/*", authMiddleware);
  api.use("/presets/*", authMiddleware);
  api.use("/sensitive-topics/*", authMiddleware);
  api.use("/state/*", authMiddleware);
}

// ===========================================================================
// Helper: Get userId from context
// ===========================================================================

function getUserId(c: Context): string | null {
  // First try SDK auth middleware (cookie-based)
  // @ts-ignore - Set by SDK auth middleware
  const authUserId = c.get("authUserId") as string | null;
  if (authUserId) {
    return authUserId;
  }

  // Fallback: Check X-User-Id header (for dev/ngrok when cookies don't work)
  const headerUserId = c.req.header("X-User-Id");
  if (headerUserId) {
    console.log(`[Auth] Using X-User-Id header: ${headerUserId}`);
    return headerUserId;
  }

  return null;
}

function requireAuth(c: Context): string | Response {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return userId;
}

function requireSession(
  c: Context,
): { userId: string; session: UserSession } | Response {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = UserSession.get(userId);
  if (!session) {
    return c.json({ error: "No active session" }, 404);
  }
  return { userId, session };
}

/**
 * Get session if available, otherwise just return userId for DB queries
 * This allows read operations to work even without active glasses connection
 */
function getSessionOrUserId(
  c: Context,
): { userId: string; session: UserSession | null } | Response {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = UserSession.get(userId);
  return { userId, session };
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
    dbConnected: isDBConnected(),
  });
});

api.get("/me", async (c: Context) => {
  const userId = getUserId(c);

  if (!userId) {
    return c.json({
      authenticated: false,
      userId: null,
    });
  }

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
  const authUserId = getUserId(c);
  const queryUserId = c.req.query("userId");
  const userId = authUserId || queryUserId || "anonymous";

  console.log(`[SSE] Connection request from userId: ${userId}`);
  console.log(
    `[SSE] Active sessions: ${JSON.stringify(UserSession.getActiveUserIds())}`,
  );

  const session = UserSession.get(userId);

  if (session) {
    console.log(
      `[SSE] Found existing session for ${userId}, using session's broadcast manager`,
    );
    return session.broadcast.createSSEResponse(c);
  }

  // No session yet - create a temporary broadcast manager
  // The frontend should reconnect when a session becomes available
  console.log(
    `[SSE] No session for ${userId}, creating temporary broadcast manager`,
  );
  console.log(`[SSE] Hint: Connect glasses to create a session for this user`);

  const broadcastManager = new BroadcastManager(userId);
  return broadcastManager.createSSEResponse(c);
});

// ===========================================================================
// Transcript Endpoints
// ===========================================================================

/**
 * GET /api/transcript/today - Get today's transcript
 */
api.get("/transcript/today", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  // If session exists, get from memory
  if (session) {
    const segments = session.transcript.getRecentSegments(undefined, true);
    return c.json({
      date: session.transcript.getCurrentDate(),
      segments,
    });
  }

  // No active session - return empty (or could query DB for historical)
  return c.json({
    date: new Date().toISOString().split("T")[0],
    segments: [],
  });
});

/**
 * GET /api/transcript/recent - Get recent transcript
 */
api.get("/transcript/recent", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const count = parseInt(c.req.query("count") || "50", 10);
  const finalOnly = c.req.query("finalOnly") !== "false";

  if (session) {
    const segments = session.transcript.getRecentSegments(count, finalOnly);
    return c.json({
      success: true,
      date: session.transcript.getCurrentDate(),
      segments,
      text: segments.map((s) => s.text).join(" "),
    });
  }

  // No active session
  return c.json({
    success: true,
    date: new Date().toISOString().split("T")[0],
    segments: [],
    text: "",
  });
});

/**
 * GET /api/transcript/:date - Get transcript by date
 */
api.get("/transcript/:date", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const date = c.req.param("date");

  if (session) {
    const transcript = await session.transcript.getDailyTranscript(date);
    if (!transcript) {
      return c.json({ segments: [] });
    }
    return c.json({
      date,
      segments: transcript.segments,
    });
  }

  // No active session - return empty
  return c.json({ date, segments: [] });
});

/**
 * GET /api/transcript/:date/range - Get transcript range
 */
api.get("/transcript/:date/range", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const date = c.req.param("date");
  const start = parseInt(c.req.query("start") || "0", 10);
  const end = parseInt(c.req.query("end") || "999999", 10);

  if (session) {
    const transcript = await session.transcript.getDailyTranscript(date);
    if (!transcript) {
      return c.json({ segments: [] });
    }
    const segments = transcript.segments.filter(
      (s) => s.index >= start && s.index <= end,
    );
    return c.json({ segments });
  }

  // No active session
  return c.json({ segments: [] });
});

// ===========================================================================
// Meeting Endpoints
// ===========================================================================

/**
 * GET /api/meetings - List meetings with filters
 */
api.get("/meetings", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const date = c.req.query("date");
  const status = c.req.query("status");

  // If we have an active session, use the meeting manager
  if (session) {
    let meetings;
    if (date) {
      meetings = await session.meeting.getMeetingsForDate(date);
    } else {
      meetings = session.meeting.getRecentMeetings();
    }

    if (status) {
      meetings = meetings.filter((m) => m.status === status);
    }

    return c.json(meetings);
  }

  // No active session - query database directly
  if (isDBConnected()) {
    try {
      const { Meeting: MeetingModel } = await import("../services/db");
      const query: any = { userId };
      if (date) {
        query.date = date;
      }
      if (status) {
        query.status = status;
      }
      const meetings = await MeetingModel.find(query)
        .sort({ startTime: -1 })
        .limit(50);
      return c.json(
        meetings.map((m) => ({
          id: m._id?.toString(),
          ...m.toObject(),
        })),
      );
    } catch (error) {
      console.error("[API] Meetings fetch error:", error);
    }
  }

  // Fallback: empty array
  return c.json([]);
});

/**
 * GET /api/meetings/active - Get active meeting
 */
api.get("/meetings/active", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session) {
    return c.json({
      success: true,
      active: false,
    });
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
 * GET /api/meetings/recent - Get recent meetings
 */
api.get("/meetings/recent", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session) {
    return c.json({
      success: true,
      meetings: [],
    });
  }

  const meetings = session.meeting.getRecentMeetings();

  return c.json({
    success: true,
    meetings,
  });
});

/**
 * GET /api/meetings/:id - Get meeting by ID
 */
api.get("/meetings/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const meetingId = c.req.param("id");
  const meeting = await session.meeting.getMeetingById(meetingId);

  if (!meeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  const includeTranscript = c.req.query("transcript") === "true";
  let transcript: string | undefined;

  if (includeTranscript) {
    transcript = session.meeting.getMeetingTranscript(meeting);
  }

  return c.json({
    ...meeting,
    id: meeting._id,
    transcript,
  });
});

/**
 * POST /api/meetings/:id/end - End a meeting
 */
api.post("/meetings/:id/end", async (c: Context) => {
  // This operation requires an active session
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const meetingId = c.req.param("id");
  const activeMeeting = session.meeting.getActiveMeeting();

  if (!activeMeeting || activeMeeting._id !== meetingId) {
    return c.json({ error: "Meeting not found or not active" }, 404);
  }

  const meeting = await session.meeting.endMeeting();

  return c.json({
    ...meeting,
    id: meeting?._id,
  });
});

/**
 * POST /api/meetings/end - End active meeting
 */
api.post("/meetings/end", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session.meeting.isInMeeting()) {
    return c.json({ error: "No active meeting" }, 400);
  }

  const meeting = await session.meeting.endMeeting();

  return c.json({
    success: true,
    meeting,
  });
});

/**
 * POST /api/meetings/:id/process - Trigger meeting processing
 */
api.post("/meetings/:id/process", async (c: Context) => {
  // This operation requires an active session
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const meetingId = c.req.param("id");
  const meeting = await session.meeting.getMeetingById(meetingId);

  if (!meeting) {
    return c.json({ error: "Meeting not found" }, 404);
  }

  // Generate notes for the meeting
  const note = await session.notes.generateNotes(meetingId);

  return c.json({
    ...meeting,
    id: meeting._id,
    status: "complete",
    noteId: note?._id,
  });
});

// ===========================================================================
// Notes Endpoints
// ===========================================================================

/**
 * GET /api/notes - List notes with filters
 */
api.get("/notes", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const date = c.req.query("date");

  if (isDBConnected()) {
    try {
      const query: any = { userId };
      const notes = await NoteModel.find(query)
        .sort({ createdAt: -1 })
        .limit(50);
      return c.json(
        notes.map((n) => ({
          id: n._id?.toString(),
          ...n.toObject(),
        })),
      );
    } catch (error) {
      console.error("[API] Notes fetch error:", error);
    }
  }

  return c.json([]);
});

/**
 * GET /api/notes/:id - Get note by ID
 */
api.get("/notes/:id", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const noteId = c.req.param("id");

  if (isDBConnected()) {
    try {
      const note = await NoteModel.findOne({ _id: noteId, userId });
      if (note) {
        return c.json({
          id: note._id?.toString(),
          ...note.toObject(),
        });
      }
    } catch (error) {
      console.error("[API] Note fetch error:", error);
    }
  }

  return c.json({ error: "Note not found" }, 404);
});

/**
 * GET /api/notes/meeting/:meetingId - Get note by meeting ID
 */
api.get("/notes/meeting/:meetingId", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const meetingId = c.req.param("meetingId");

  if (isDBConnected()) {
    try {
      const note = await NoteModel.findOne({ meetingId, userId });
      if (note) {
        return c.json({
          id: note._id?.toString(),
          ...note.toObject(),
        });
      }
    } catch (error) {
      console.error("[API] Note fetch error:", error);
    }
  }

  return c.json({ error: "Note not found" }, 404);
});

/**
 * POST /api/notes - Create note
 */
api.post("/notes", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  try {
    const body = await c.req.json();

    if (isDBConnected()) {
      const note = await NoteModel.create({
        userId,
        title: body.title || "Untitled Note",
        summary: body.summary || body.content || "",
        content: body.content || "",
        meetingId: body.meetingId,
        keyPoints: body.keyPoints || [],
        decisions: body.decisions || [],
        detailLevel: "standard",
      });

      return c.json({
        id: note._id?.toString(),
        ...note.toObject(),
      });
    }

    return c.json({ error: "Database not available" }, 503);
  } catch (error) {
    console.error("[API] Note create error:", error);
    return c.json({ error: "Failed to create note" }, 500);
  }
});

/**
 * PUT /api/notes/:id - Update note
 */
api.put("/notes/:id", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const noteId = c.req.param("id");

  try {
    const body = await c.req.json();

    if (isDBConnected()) {
      const note = await NoteModel.findOneAndUpdate(
        { _id: noteId, userId },
        { $set: body },
        { new: true },
      );

      if (note) {
        return c.json({
          id: note._id?.toString(),
          ...note.toObject(),
        });
      }
    }

    return c.json({ error: "Note not found" }, 404);
  } catch (error) {
    console.error("[API] Note update error:", error);
    return c.json({ error: "Failed to update note" }, 500);
  }
});

/**
 * POST /api/notes/:id/generate-summary - Regenerate notes summary
 */
api.post("/notes/:id/generate-summary", async (c: Context) => {
  // This operation requires an active session for LLM access
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const noteId = c.req.param("id");

  if (isDBConnected()) {
    try {
      const note = await NoteModel.findOne({ _id: noteId, userId });
      if (note && note.meetingId) {
        const regenerated = await session.notes.generateNotes(note.meetingId);
        if (regenerated) {
          return c.json({
            id: regenerated._id,
            ...regenerated,
          });
        }
      }
    } catch (error) {
      console.error("[API] Note regenerate error:", error);
    }
  }

  return c.json({ error: "Failed to regenerate notes" }, 500);
});

/**
 * POST /api/notes/:id/email - Email a note
 */
api.post("/notes/:id/email", async (c: Context) => {
  // This operation requires an active session for email access
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const noteId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({}));
    const recipient = body.recipient || session.email.getDefaultRecipient();

    if (!recipient) {
      return c.json({ error: "No recipient email configured" }, 400);
    }

    if (!session.email.isAvailable()) {
      return c.json({ error: "Email service not available" }, 503);
    }

    // Get note from database
    if (isDBConnected()) {
      const note = await NoteModel.findOne({ _id: noteId, userId });
      if (!note) {
        return c.json({ error: "Note not found" }, 404);
      }

      // Get meeting if linked
      let meeting = null;
      if (note.meetingId) {
        const { Meeting: MeetingModel } = await import("../services/db");
        meeting = await MeetingModel.findOne({ _id: note.meetingId, userId });
      }

      // Get action items for the note
      const actionItems = await ActionItemModel.find({ noteId, userId });

      // Send email
      const emailResult = await session.email.sendMeetingSummary(
        meeting ||
          ({
            _id: note.meetingId || "unknown",
            userId,
            title: note.title,
            category: "unknown",
            startTime: note.createdAt,
            endTime: note.createdAt,
            status: "complete",
            transcriptDate: "",
            transcriptStartIndex: 0,
            attendees: [],
            topics: [],
            isSensitive: false,
            actionItemIds: [],
            researchIds: [],
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          } as any),
        {
          _id: note._id?.toString(),
          userId: note.userId,
          title: note.title,
          summary: note.summary,
          keyPoints: note.keyPoints,
          decisions: note.decisions,
          content: note.content,
          detailLevel: note.detailLevel as any,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
        actionItems.map((a) => ({
          _id: a._id?.toString(),
          userId: a.userId,
          description: a.description,
          assignee: a.assignee,
          dueDate: a.dueDate,
          priority: a.priority as any,
          status: a.status as any,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
        { to: recipient },
      );

      if (emailResult.success) {
        return c.json({
          success: true,
          messageId: emailResult.messageId,
        });
      } else {
        return c.json({ error: emailResult.error }, 500);
      }
    }

    return c.json({ error: "Database not available" }, 503);
  } catch (error) {
    console.error("[API] Note email error:", error);
    return c.json({ error: "Failed to send email" }, 500);
  }
});

// ===========================================================================
// Action Items Endpoints
// ===========================================================================

/**
 * GET /api/actions - List action items with filters
 */
api.get("/actions", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const status = c.req.query("status");
  const priority = c.req.query("priority");

  if (isDBConnected()) {
    try {
      const query: any = { userId };
      if (status) query.status = status;
      if (priority) query.priority = priority;

      const items = await ActionItemModel.find(query).sort({
        priority: -1,
        dueDate: 1,
      });
      return c.json(
        items.map((item) => ({
          id: item._id?.toString(),
          task: item.description,
          owner: item.assignee || "",
          ...item.toObject(),
        })),
      );
    } catch (error) {
      console.error("[API] Actions fetch error:", error);
    }
  }

  return c.json([]);
});

/**
 * GET /api/actions/:id - Get action item by ID
 */
api.get("/actions/:id", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const actionId = c.req.param("id");

  if (isDBConnected()) {
    try {
      const item = await ActionItemModel.findOne({ _id: actionId, userId });
      if (item) {
        return c.json({
          id: item._id?.toString(),
          task: item.description,
          owner: item.assignee || "",
          ...item.toObject(),
        });
      }
    } catch (error) {
      console.error("[API] Action fetch error:", error);
    }
  }

  return c.json({ error: "Action item not found" }, 404);
});

/**
 * POST /api/actions - Create action item
 */
api.post("/actions", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  try {
    const body = await c.req.json();

    if (isDBConnected()) {
      const item = await ActionItemModel.create({
        userId,
        description: body.task || body.description,
        assignee: body.owner || body.assignee,
        dueDate: body.dueDate,
        priority: body.priority || "medium",
        status: body.status || "pending",
        meetingId: body.sourceMeetingId || body.meetingId,
        noteId: body.sourceNoteId || body.noteId,
      });

      return c.json({
        id: item._id?.toString(),
        task: item.description,
        owner: item.assignee || "",
        ...item.toObject(),
      });
    }

    return c.json({ error: "Database not available" }, 503);
  } catch (error) {
    console.error("[API] Action create error:", error);
    return c.json({ error: "Failed to create action item" }, 500);
  }
});

/**
 * PUT /api/actions/:id - Update action item
 */
api.put("/actions/:id", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const actionId = c.req.param("id");

  try {
    const body = await c.req.json();

    // Map frontend fields to our schema
    const updates: any = {};
    if (body.task !== undefined) updates.description = body.task;
    if (body.description !== undefined) updates.description = body.description;
    if (body.owner !== undefined) updates.assignee = body.owner;
    if (body.assignee !== undefined) updates.assignee = body.assignee;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;

    if (isDBConnected()) {
      const item = await ActionItemModel.findOneAndUpdate(
        { _id: actionId, userId },
        { $set: updates },
        { new: true },
      );

      if (item) {
        return c.json({
          id: item._id?.toString(),
          task: item.description,
          owner: item.assignee || "",
          ...item.toObject(),
        });
      }
    }

    return c.json({ error: "Action item not found" }, 404);
  } catch (error) {
    console.error("[API] Action update error:", error);
    return c.json({ error: "Failed to update action item" }, 500);
  }
});

/**
 * DELETE /api/actions/:id - Delete action item
 */
api.delete("/actions/:id", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const actionId = c.req.param("id");

  if (isDBConnected()) {
    try {
      const result = await ActionItemModel.deleteOne({ _id: actionId, userId });
      if (result.deletedCount > 0) {
        return c.json({ success: true });
      }
    } catch (error) {
      console.error("[API] Action delete error:", error);
    }
  }

  return c.json({ error: "Action item not found" }, 404);
});

// ===========================================================================
// Research Endpoints
// ===========================================================================

/**
 * POST /api/research - Start research
 */
api.post("/research", async (c: Context) => {
  // This operation requires an active session
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session.research.isAvailable()) {
    return c.json(
      { error: "Research not available (FIRECRAWL_API_KEY not set)" },
      503,
    );
  }

  try {
    const body = await c.req.json();
    const query = body.query as string;
    const type =
      (body.type as "person" | "company" | "topic" | "general") || "general";

    if (!query || query.trim() === "") {
      return c.json({ error: "query is required" }, 400);
    }

    const researchResult = await session.research.startResearch(
      query.trim(),
      type,
    );

    if (!researchResult) {
      return c.json({ error: "Research failed" }, 500);
    }

    return c.json({
      id: researchResult._id,
      ...researchResult,
    });
  } catch (error) {
    console.error("[API] Research error:", error);
    return c.json({ error: "Research failed" }, 500);
  }
});

/**
 * GET /api/research/status - Check research availability
 */
api.get("/research/status", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session) {
    return c.json({
      success: true,
      available: false,
      isResearching: false,
      activeResearch: null,
    });
  }

  return c.json({
    success: true,
    available: session.research.isAvailable(),
    isResearching: session.research.isResearching(),
    activeResearch: session.research.getActiveResearch(),
  });
});

/**
 * GET /api/research/:id - Get research result
 */
api.get("/research/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const researchId = c.req.param("id");

  // Check session cache first
  const cached = session.research.getResult(researchId);
  if (cached) {
    return c.json({
      id: cached._id,
      ...cached,
    });
  }

  // Check database
  if (isDBConnected()) {
    try {
      const research = await ResearchResultModel.findOne({
        _id: researchId,
        userId,
      });
      if (research) {
        return c.json({
          id: research._id?.toString(),
          ...research.toObject(),
        });
      }
    } catch (error) {
      console.error("[API] Research fetch error:", error);
    }
  }

  return c.json({ error: "Research result not found" }, 404);
});

/**
 * GET /api/research/meeting/:meetingId - Get research by meeting
 */
api.get("/research/meeting/:meetingId", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  const meetingId = c.req.param("meetingId");

  if (isDBConnected()) {
    try {
      const results = await ResearchResultModel.find({ meetingId, userId });
      return c.json(
        results.map((r) => ({
          id: r._id?.toString(),
          ...r.toObject(),
        })),
      );
    } catch (error) {
      console.error("[API] Research fetch error:", error);
    }
  }

  return c.json([]);
});

/**
 * GET /api/research/results - Get all cached research results
 */
api.get("/research/results", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session) {
    return c.json({
      success: true,
      results: [],
    });
  }

  return c.json({
    success: true,
    results: session.research.getAllResults(),
  });
});

/**
 * POST /api/research/quick - Quick research
 */
api.post("/research/quick", async (c: Context) => {
  // This operation requires an active session
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session.research.isAvailable()) {
    return c.json({ error: "Research not available" }, 503);
  }

  try {
    const body = await c.req.json();
    const query = body.query as string;

    if (!query || query.trim() === "") {
      return c.json({ error: "query is required" }, 400);
    }

    const facts = await session.research.quickResearch(query.trim());

    return c.json({
      success: true,
      query,
      facts,
    });
  } catch (error) {
    console.error("[API] Quick research error:", error);
    return c.json({ error: "Quick research failed" }, 500);
  }
});

/**
 * POST /api/research/scrape - Scrape a URL
 */
api.post("/research/scrape", async (c: Context) => {
  // This operation requires an active session
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session.research.isAvailable()) {
    return c.json({ error: "Research not available" }, 503);
  }

  try {
    const body = await c.req.json();
    const url = body.url as string;

    if (!url || !url.startsWith("http")) {
      return c.json({ error: "Valid URL is required" }, 400);
    }

    const scrapeResult = await session.research.scrapeUrl(url);

    if (!scrapeResult) {
      return c.json({ error: "Failed to scrape URL" }, 500);
    }

    return c.json({
      success: true,
      result: scrapeResult,
    });
  } catch (error) {
    console.error("[API] Scrape error:", error);
    return c.json({ error: "Scrape failed" }, 500);
  }
});

/**
 * POST /api/research/:id/email - Email research result
 */
api.post("/research/:id/email", async (c: Context) => {
  // This operation requires an active session for email access
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const researchId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({}));
    const recipient = body.recipient || session.email.getDefaultRecipient();

    if (!recipient) {
      return c.json({ error: "No recipient email configured" }, 400);
    }

    if (!session.email.isAvailable()) {
      return c.json({ error: "Email service not available" }, 503);
    }

    // Check session cache first
    let research = session.research.getResult(researchId);

    // Check database if not in cache
    if (!research && isDBConnected()) {
      const dbResearch = await ResearchResultModel.findOne({
        _id: researchId,
        userId,
      });
      if (dbResearch) {
        research = {
          _id: dbResearch._id?.toString(),
          userId: dbResearch.userId,
          query: dbResearch.query,
          type: dbResearch.type as any,
          summary: dbResearch.summary,
          keyFacts: dbResearch.keyFacts,
          sources: dbResearch.sources,
          content: dbResearch.content,
          createdAt: dbResearch.createdAt,
        };
      }
    }

    if (!research) {
      return c.json({ error: "Research not found" }, 404);
    }

    // Send email
    const emailResult = await session.email.sendResearchResults(
      research as any,
      {
        to: recipient,
      },
    );

    if (emailResult.success) {
      return c.json({
        success: true,
        messageId: emailResult.messageId,
      });
    } else {
      return c.json({ error: emailResult.error }, 500);
    }
  } catch (error) {
    console.error("[API] Research email error:", error);
    return c.json({ error: "Failed to send email" }, 500);
  }
});

// ===========================================================================
// Settings Endpoints
// ===========================================================================

/**
 * GET /api/settings - Get user settings
 */
api.get("/settings", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  // Default settings
  const defaultSettings = {
    autonomyLevel: "suggest",
    showTranscriptOnGlasses: true,
    emailSummaries: false,
    emailAddress: null,
  };

  // If we have an active session, get from session manager
  if (session) {
    const settings = session.settings.getSettings();

    // Also try to get from database for persistence
    if (isDBConnected()) {
      try {
        const dbSettings = await getOrCreateUserSettings(userId);
        return c.json({
          ...settings,
          autonomyLevel: dbSettings.autonomyLevel,
          showTranscriptOnGlasses: dbSettings.showTranscriptOnGlasses,
          emailSummaries: dbSettings.emailSummaries,
          emailAddress: dbSettings.emailAddress,
        });
      } catch (error) {
        console.error("[API] Settings fetch error:", error);
      }
    }

    return c.json(settings);
  }

  // No active session - query database directly
  if (isDBConnected()) {
    try {
      const dbSettings = await getOrCreateUserSettings(userId);
      return c.json({
        ...defaultSettings,
        autonomyLevel: dbSettings.autonomyLevel,
        showTranscriptOnGlasses: dbSettings.showTranscriptOnGlasses,
        emailSummaries: dbSettings.emailSummaries,
        emailAddress: dbSettings.emailAddress,
      });
    } catch (error) {
      console.error("[API] Settings fetch error:", error);
    }
  }

  return c.json(defaultSettings);
});

/**
 * PUT /api/settings - Update user settings
 */
api.put("/settings", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();

    // Update session settings if session exists
    if (session) {
      await session.settings.updateSettings(body);
    }

    // Persist to database
    if (isDBConnected()) {
      const updated = await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: body },
        { upsert: true, new: true },
      );
      return c.json(updated?.toObject() || body);
    }

    if (session) {
      return c.json(session.settings.getSettings());
    }

    return c.json(body);
  } catch (error) {
    console.error("[API] Settings update error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

/**
 * PATCH /api/settings - Patch user settings
 */
api.patch("/settings", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();

    // Update session settings if session exists
    if (session) {
      await session.settings.updateSettings(body);
    }

    if (isDBConnected()) {
      const updated = await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: body },
        { upsert: true, new: true },
      );
      return c.json({
        success: true,
        settings: updated?.toObject() || body,
      });
    }

    return c.json({
      success: true,
      settings: session ? session.settings.getSettings() : body,
    });
  } catch (error) {
    console.error("[API] Settings update error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// ===========================================================================
// Presets Endpoints
// ===========================================================================

/**
 * GET /api/presets - Get all presets
 */
api.get("/presets", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const active = c.req.query("active");

  // If we have an active session, get from session manager (has system presets)
  if (session) {
    let presets = session.settings.getPresets();

    if (active === "true") {
      presets = presets.filter((p) => p.isActive !== false);
    }

    return c.json(
      presets.map((p) => ({
        id: p._id,
        ...p,
      })),
    );
  }

  // No active session - query database directly
  if (isDBConnected()) {
    try {
      const query: any = { userId };
      if (active === "true") {
        query.isActive = { $ne: false };
      }
      const presets = await PresetModel.find(query);
      return c.json(
        presets.map((p) => ({
          id: p._id?.toString(),
          ...p.toObject(),
        })),
      );
    } catch (error) {
      console.error("[API] Presets fetch error:", error);
    }
  }

  // Return default system presets
  return c.json([]);
});

/**
 * GET /api/presets/:id - Get preset by ID
 */
api.get("/presets/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const presetId = c.req.param("id");

  // If we have an active session, use session manager
  if (session) {
    const preset = session.settings.getPreset(presetId);

    if (!preset) {
      return c.json({ error: "Preset not found" }, 404);
    }

    return c.json({
      id: preset._id,
      ...preset,
    });
  }

  // No active session - query database directly
  if (isDBConnected()) {
    try {
      const preset = await PresetModel.findOne({ _id: presetId, userId });
      if (preset) {
        return c.json({
          id: preset._id?.toString(),
          ...preset.toObject(),
        });
      }
    } catch (error) {
      console.error("[API] Preset fetch error:", error);
    }
  }

  return c.json({ error: "Preset not found" }, 404);
});

/**
 * POST /api/presets - Create preset
 */
api.post("/presets", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();

    // If we have an active session, use session manager
    if (session) {
      const preset = await session.settings.addPreset({
        name: body.name,
        category: body.category,
        condition: body.condition,
        userContext: body.userContext,
        noteRules: body.noteRules,
        researchTriggers: body.researchTriggers,
        sensitive: body.sensitive,
        sensitiveReason: body.sensitiveReason,
      });

      return c.json({
        id: preset._id,
        ...preset,
      });
    }

    // No active session - create directly in database
    if (isDBConnected()) {
      const preset = await PresetModel.create({
        userId,
        name: body.name,
        category: body.category,
        condition: body.condition,
        userContext: body.userContext,
        noteRules: body.noteRules,
        researchTriggers: body.researchTriggers,
        sensitive: body.sensitive,
        sensitiveReason: body.sensitiveReason,
        isActive: true,
      });

      return c.json({
        id: preset._id?.toString(),
        ...preset.toObject(),
      });
    }

    return c.json({ error: "Database not available" }, 503);
  } catch (error) {
    console.error("[API] Preset create error:", error);
    return c.json({ error: "Failed to create preset" }, 500);
  }
});

/**
 * PUT /api/presets/:id - Update preset
 */
api.put("/presets/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const presetId = c.req.param("id");

  try {
    const body = await c.req.json();

    // If we have an active session, use session manager
    if (session) {
      const updated = await session.settings.updatePreset(presetId, body);

      if (!updated) {
        return c.json({ error: "Preset not found" }, 404);
      }

      return c.json({
        id: updated._id,
        ...updated,
      });
    }

    // No active session - update directly in database
    if (isDBConnected()) {
      const updated = await PresetModel.findOneAndUpdate(
        { _id: presetId, userId },
        { $set: body },
        { new: true },
      );

      if (updated) {
        return c.json({
          id: updated._id?.toString(),
          ...updated.toObject(),
        });
      }
    }

    return c.json({ error: "Preset not found" }, 404);
  } catch (error) {
    console.error("[API] Preset update error:", error);
    return c.json({ error: "Failed to update preset" }, 500);
  }
});

/**
 * DELETE /api/presets/:id - Delete preset
 */
api.delete("/presets/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const presetId = c.req.param("id");

  try {
    // If we have an active session, use session manager
    if (session) {
      const deleted = await session.settings.removePreset(presetId);

      if (!deleted) {
        return c.json({ error: "Preset not found or is a system preset" }, 404);
      }

      return c.json({ success: true });
    }

    // No active session - delete directly from database
    if (isDBConnected()) {
      const result = await PresetModel.deleteOne({ _id: presetId, userId });
      if (result.deletedCount > 0) {
        return c.json({ success: true });
      }
    }

    return c.json({ error: "Preset not found" }, 404);
  } catch (error) {
    console.error("[API] Preset delete error:", error);
    return c.json({ error: "Failed to delete preset" }, 500);
  }
});

// ===========================================================================
// Sensitive Topics Endpoints
// ===========================================================================

/**
 * GET /api/sensitive-topics - Get sensitive topics
 */
api.get("/sensitive-topics", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  // If we have an active session, use session manager
  if (session) {
    const topics = session.settings.getSensitiveTopics();

    return c.json(
      topics.map((t) => ({
        id: t._id,
        keyword: t.keyword,
      })),
    );
  }

  // No active session - query database directly
  if (isDBConnected()) {
    try {
      const topics = await SensitiveTopicModel.find({ userId });
      return c.json(
        topics.map((t) => ({
          id: t._id?.toString(),
          keyword: t.keyword,
        })),
      );
    } catch (error) {
      console.error("[API] Sensitive topics fetch error:", error);
    }
  }

  return c.json([]);
});

/**
 * POST /api/sensitive-topics - Add sensitive topic
 */
api.post("/sensitive-topics", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();
    const keyword = body.keyword;

    if (!keyword || keyword.trim() === "") {
      return c.json({ error: "keyword is required" }, 400);
    }

    // If we have an active session, use session manager
    if (session) {
      const topic = await session.settings.addSensitiveTopic(keyword.trim());

      return c.json({
        id: topic._id,
        keyword: topic.keyword,
      });
    }

    // No active session - create directly in database
    if (isDBConnected()) {
      const topic = await SensitiveTopicModel.create({
        userId,
        keyword: keyword.trim(),
      });

      return c.json({
        id: topic._id?.toString(),
        keyword: topic.keyword,
      });
    }

    return c.json({ error: "Database not available" }, 503);
  } catch (error) {
    console.error("[API] Sensitive topic create error:", error);
    return c.json({ error: "Failed to add sensitive topic" }, 500);
  }
});

/**
 * DELETE /api/sensitive-topics/:id - Remove sensitive topic
 */
api.delete("/sensitive-topics/:id", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const topicId = c.req.param("id");

  try {
    // If we have an active session, use session manager
    if (session) {
      const deleted = await session.settings.removeSensitiveTopic(topicId);

      if (!deleted) {
        return c.json({ error: "Topic not found or is a system topic" }, 404);
      }

      return c.json({ success: true });
    }

    // No active session - delete directly from database
    if (isDBConnected()) {
      const result = await SensitiveTopicModel.deleteOne({
        _id: topicId,
        userId,
      });
      if (result.deletedCount > 0) {
        return c.json({ success: true });
      }
    }

    return c.json({ error: "Topic not found" }, 404);
  } catch (error) {
    console.error("[API] Sensitive topic delete error:", error);
    return c.json({ error: "Failed to remove sensitive topic" }, 500);
  }
});

// ===========================================================================
// State Endpoints
// ===========================================================================

/**
 * GET /api/state - Get app state
 */
api.get("/state", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  console.log(`[API] /state request for userId: ${userId}`);
  console.log(
    `[API] Active sessions: ${JSON.stringify(UserSession.getActiveUserIds())}`,
  );
  console.log(`[API] Session found: ${!!session}`);

  // If no active session, return idle state
  if (!session) {
    return c.json({
      isRecording: false,
      meetingState: "idle",
      currentMeetingId: null,
      hasActiveSession: false,
      debug: {
        requestedUserId: userId,
        activeSessions: UserSession.getActiveUserIds(),
      },
    });
  }

  const isInMeeting = session.meeting.isInMeeting();
  const activeMeeting = session.meeting.getActiveMeeting();

  let meetingState: string = "idle";
  if (isInMeeting) {
    meetingState = "meeting_active";
  } else if (activeMeeting) {
    meetingState =
      activeMeeting.status === "processing" ? "processing" : "meeting_ended";
  }

  return c.json({
    isRecording: true, // Always recording when session active
    meetingState,
    currentMeetingId: activeMeeting?._id,
    hasActiveSession: true,
  });
});

/**
 * POST /api/state/recording/start - Start recording
 */
api.post("/state/recording/start", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  // If no active session, return current state
  if (!session) {
    return c.json({
      isRecording: false,
      meetingState: "idle",
      currentMeetingId: null,
      error: "No active glasses session. Connect your glasses first.",
    });
  }

  // Recording is always on when connected - this is a no-op for now
  return c.json({
    isRecording: true,
    meetingState: session.meeting.isInMeeting() ? "meeting_active" : "idle",
    currentMeetingId: session.meeting.getActiveMeetingId(),
  });
});

/**
 * POST /api/state/recording/stop - Stop recording
 */
api.post("/state/recording/stop", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  // If no active session, return current state
  if (!session) {
    return c.json({
      isRecording: false,
      meetingState: "idle",
      currentMeetingId: null,
    });
  }

  // End any active meeting
  if (session.meeting.isInMeeting()) {
    await session.meeting.endMeeting();
  }

  return c.json({
    isRecording: false,
    meetingState: "idle",
  });
});

/**
 * POST /api/state/glasses/transcript - Toggle glasses transcript
 */
api.post("/state/glasses/transcript", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  if (!session) {
    return c.json({
      success: false,
      error: "No active glasses session",
    });
  }

  try {
    const body = await c.req.json();
    const enabled = body.enabled;

    if (enabled) {
      session.display.enableTranscript();
    } else {
      session.display.disableTranscript();
    }

    return c.json({ success: true, enabled });
  } catch (error) {
    console.error("[API] Toggle transcript error:", error);
    return c.json({ error: "Failed to toggle transcript" }, 500);
  }
});

// ===========================================================================
// Legacy Settings Endpoints (for backwards compatibility)
// ===========================================================================

/**
 * GET /api/debug/presets - Get all presets for debug
 */
api.get("/debug/presets", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { session } = result;

  return c.json({
    success: true,
    presets: session.settings.getPresets(),
    systemPresets: session.settings.getSystemPresets(),
    userPresets: session.settings.getUserPresets(),
  });
});

/**
 * GET /api/settings/sensitive-topics - Get sensitive topics (legacy)
 */
api.get("/settings/sensitive-topics", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  return c.json({
    success: true,
    topics: session.settings.getSensitiveTopics(),
  });
});

// ===========================================================================
// Demo Endpoints (for testing e2e flow)
// ===========================================================================

/**
 * POST /api/demo/start-meeting - Manually start a demo meeting
 */
api.post("/demo/start-meeting", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  if (!session) {
    return c.json({
      success: false,
      error: "No active glasses session. Connect your glasses first.",
    });
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const title = body.title || "Demo Meeting";
    const category = body.category || "investor_update";

    // Start meeting
    await session.meeting.startMeeting({
      title,
      category,
      confidence: 0.95,
      attendees: body.attendees || ["Demo User"],
    });

    const meeting = session.meeting.getActiveMeeting();

    return c.json({
      success: true,
      message: `Meeting started: ${title}`,
      meeting,
    });
  } catch (error) {
    console.error("[API] Demo start meeting error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/demo/end-meeting - End meeting and generate notes
 */
api.post("/demo/end-meeting", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  if (!session) {
    return c.json({
      success: false,
      error: "No active glasses session",
    });
  }

  if (!session.meeting.isInMeeting()) {
    return c.json({
      success: false,
      error: "No active meeting to end",
    });
  }

  try {
    // End the meeting
    const meeting = await session.meeting.endMeeting();

    if (!meeting) {
      return c.json({ success: false, error: "Failed to end meeting" }, 500);
    }

    // Generate notes (this also triggers email automatically)
    const note = await session.notes.generateNotes(meeting._id!);

    // Get action items
    const actionItems = await session.notes.getActionItemsForMeeting(
      meeting._id!,
    );

    return c.json({
      success: true,
      message: "Meeting ended, notes generated",
      meeting,
      note: note
        ? {
            id: note._id,
            title: note.title,
            summary: note.summary,
            keyPoints: note.keyPoints,
            decisions: note.decisions,
          }
        : null,
      actionItems: actionItems.map((ai) => ({
        id: ai._id,
        description: ai.description,
        assignee: ai.assignee,
        priority: ai.priority,
      })),
      emailSent: session.email.isAvailable(),
    });
  } catch (error) {
    console.error("[API] Demo end meeting error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/demo/add-transcript - Add transcript text for testing
 */
api.post("/demo/add-transcript", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  if (!session) {
    return c.json({
      success: false,
      error: "No active glasses session",
    });
  }

  try {
    const body = await c.req.json();
    const text = body.text || "This is a test transcript segment.";

    // Add to transcript
    session.onTranscription({
      text,
      isFinal: body.isFinal !== false,
      timestamp: Date.now(),
      speakerHint: body.speaker,
    });

    return c.json({
      success: true,
      message: "Transcript added",
      text,
    });
  } catch (error) {
    console.error("[API] Demo add transcript error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * POST /api/demo/send-email - Test email sending
 */
api.post("/demo/send-email", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  if (!session) {
    return c.json({
      success: false,
      error: "No active glasses session",
    });
  }

  if (!session.email.isAvailable()) {
    return c.json({
      success: false,
      error: "Email not available. Set RESEND_API_KEY.",
    });
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const to = body.to || userId;
    const subject = body.subject || "SEGA Test Email";
    const content = body.content || "This is a test email from SEGA.";

    const result = await session.email.sendCustomEmail(
      to,
      subject,
      `<div style="font-family: sans-serif; padding: 20px;">
        <h1 style="color: #1a1a1a;">SEGA Test Email</h1>
        <p>${content}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Sent from SEGA Demo</p>
      </div>`,
    );

    return c.json({
      success: result.success,
      message: result.success ? `Email sent to ${to}` : result.error,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[API] Demo send email error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * GET /api/demo/status - Get demo status
 */
api.get("/demo/status", async (c: Context) => {
  const result = getSessionOrUserId(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  return c.json({
    success: true,
    userId,
    hasSession: !!session,
    sessionState: session
      ? {
          isInMeeting: session.meeting.isInMeeting(),
          activeMeeting: session.meeting.getActiveMeeting(),
          transcriptCount: session.transcript.getCurrentIndex(),
          emailAvailable: session.email.isAvailable(),
          emailRecipient: session.email.getDefaultRecipient(),
        }
      : null,
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
    404,
  );
});
