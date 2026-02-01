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
  // @ts-ignore - Set by SDK auth middleware
  return c.get("authUserId") as string | null;
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

  const session = UserSession.get(userId);

  if (session) {
    return session.broadcast.createSSEResponse(c);
  }

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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const segments = session.transcript.getRecentSegments(undefined, true);

  return c.json({
    date: session.transcript.getCurrentDate(),
    segments,
  });
});

/**
 * GET /api/transcript/recent - Get recent transcript
 */
api.get("/transcript/recent", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
 * GET /api/transcript/:date - Get transcript by date
 */
api.get("/transcript/:date", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const date = c.req.param("date");
  const transcript = await session.transcript.getDailyTranscript(date);

  if (!transcript) {
    return c.json({ segments: [] });
  }

  return c.json({
    date,
    segments: transcript.segments,
  });
});

/**
 * GET /api/transcript/:date/range - Get transcript range
 */
api.get("/transcript/:date/range", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const date = c.req.param("date");
  const start = parseInt(c.req.query("start") || "0", 10);
  const end = parseInt(c.req.query("end") || "999999", 10);

  const transcript = await session.transcript.getDailyTranscript(date);

  if (!transcript) {
    return c.json({ segments: [] });
  }

  const segments = transcript.segments.filter(
    (s) => s.index >= start && s.index <= end,
  );

  return c.json({ segments });
});

// ===========================================================================
// Meeting Endpoints
// ===========================================================================

/**
 * GET /api/meetings - List meetings with filters
 */
api.get("/meetings", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const date = c.req.query("date");
  const status = c.req.query("status");

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
});

/**
 * GET /api/meetings/active - Get active meeting
 */
api.get("/meetings/active", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
 * POST /api/meetings/:id/end - End specific meeting
 */
api.post("/meetings/:id/end", async (c: Context) => {
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
 * POST /api/meetings/:id/process - Process meeting (generate notes)
 */
api.post("/meetings/:id/process", async (c: Context) => {
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
 * POST /api/notes/:id/generate-summary - Regenerate note summary
 */
api.post("/notes/:id/generate-summary", async (c: Context) => {
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
 * POST /api/notes/:id/email - Email note
 */
api.post("/notes/:id/email", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  // TODO: Implement email via Resend
  return c.json({ success: true, message: "Email queued" });
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
 * GET /api/research/status - Get research status
 */
api.get("/research/status", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  return c.json({
    success: true,
    available: session.research.isAvailable(),
    isResearching: session.research.isResearching(),
    activeResearch: session.research.getActiveResearch(),
  });
});

/**
 * GET /api/research/:id - Get research by ID
 */
api.get("/research/:id", async (c: Context) => {
  const result = requireSession(c);
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
 * GET /api/research/results - Get all research results
 */
api.get("/research/results", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  return c.json({
    success: true,
    results: session.research.getAllResults(),
  });
});

/**
 * POST /api/research/quick - Quick research
 */
api.post("/research/quick", async (c: Context) => {
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
 * POST /api/research/scrape - Scrape URL
 */
api.post("/research/scrape", async (c: Context) => {
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
 * POST /api/research/:id/email - Email research
 */
api.post("/research/:id/email", async (c: Context) => {
  const userId = requireAuth(c);
  if (userId instanceof Response) return userId;

  // TODO: Implement email via Resend
  return c.json({ success: true, message: "Email queued" });
});

// ===========================================================================
// Settings Endpoints
// ===========================================================================

/**
 * GET /api/settings - Get user settings
 */
api.get("/settings", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  // Get from session manager (which has defaults)
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
});

/**
 * PUT /api/settings - Update user settings
 */
api.put("/settings", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();

    // Update session settings
    await session.settings.updateSettings(body);

    // Persist to database
    if (isDBConnected()) {
      await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: body },
        { upsert: true, new: true },
      );
    }

    return c.json(session.settings.getSettings());
  } catch (error) {
    console.error("[API] Settings update error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

/**
 * PATCH /api/settings - Update user settings (partial)
 */
api.patch("/settings", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();
    await session.settings.updateSettings(body);

    if (isDBConnected()) {
      await UserSettingsModel.findOneAndUpdate(
        { userId },
        { $set: body },
        { upsert: true, new: true },
      );
    }

    return c.json({
      success: true,
      settings: session.settings.getSettings(),
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
 * GET /api/presets - List presets
 */
api.get("/presets", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  const active = c.req.query("active");

  // Get from session manager (has system presets)
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
});

/**
 * GET /api/presets/:id - Get preset by ID
 */
api.get("/presets/:id", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const presetId = c.req.param("id");
  const preset = session.settings.getPreset(presetId);

  if (!preset) {
    return c.json({ error: "Preset not found" }, 404);
  }

  return c.json({
    id: preset._id,
    ...preset,
  });
});

/**
 * POST /api/presets - Create preset
 */
api.post("/presets", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { userId, session } = result;

  try {
    const body = await c.req.json();

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
  } catch (error) {
    console.error("[API] Preset create error:", error);
    return c.json({ error: "Failed to create preset" }, 500);
  }
});

/**
 * PUT /api/presets/:id - Update preset
 */
api.put("/presets/:id", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const presetId = c.req.param("id");

  try {
    const body = await c.req.json();
    const updated = await session.settings.updatePreset(presetId, body);

    if (!updated) {
      return c.json({ error: "Preset not found" }, 404);
    }

    return c.json({
      id: updated._id,
      ...updated,
    });
  } catch (error) {
    console.error("[API] Preset update error:", error);
    return c.json({ error: "Failed to update preset" }, 500);
  }
});

/**
 * DELETE /api/presets/:id - Delete preset
 */
api.delete("/presets/:id", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const presetId = c.req.param("id");

  try {
    const deleted = await session.settings.removePreset(presetId);

    if (!deleted) {
      return c.json({ error: "Preset not found or is a system preset" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[API] Preset delete error:", error);
    return c.json({ error: "Failed to delete preset" }, 500);
  }
});

// ===========================================================================
// Sensitive Topics Endpoints
// ===========================================================================

/**
 * GET /api/sensitive-topics - List sensitive topics
 */
api.get("/sensitive-topics", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const topics = session.settings.getSensitiveTopics();

  return c.json(
    topics.map((t) => ({
      id: t._id,
      keyword: t.keyword,
    })),
  );
});

/**
 * POST /api/sensitive-topics - Add sensitive topic
 */
api.post("/sensitive-topics", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  try {
    const body = await c.req.json();
    const keyword = body.keyword;

    if (!keyword || keyword.trim() === "") {
      return c.json({ error: "keyword is required" }, 400);
    }

    const topic = await session.settings.addSensitiveTopic(keyword.trim());

    return c.json({
      id: topic._id,
      keyword: topic.keyword,
    });
  } catch (error) {
    console.error("[API] Sensitive topic create error:", error);
    return c.json({ error: "Failed to add sensitive topic" }, 500);
  }
});

/**
 * DELETE /api/sensitive-topics/:id - Remove sensitive topic
 */
api.delete("/sensitive-topics/:id", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

  const topicId = c.req.param("id");

  try {
    const deleted = await session.settings.removeSensitiveTopic(topicId);

    if (!deleted) {
      return c.json({ error: "Topic not found or is a system topic" }, 404);
    }

    return c.json({ success: true });
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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
  });
});

/**
 * POST /api/state/recording/start - Start recording
 */
api.post("/state/recording/start", async (c: Context) => {
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
  const result = requireSession(c);
  if (result instanceof Response) return result;
  const { session } = result;

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
 * GET /api/settings/presets - Get presets (legacy)
 */
api.get("/settings/presets", async (c: Context) => {
  const result = requireSession(c);
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
