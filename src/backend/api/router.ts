/**
 * SEGA API Router
 *
 * API routes for Smart Executive Glasses Assistant.
 * Includes: health check, user info, agent query, profile, and SSE.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { AuthVariables, createAuthMiddleware } from "@mentra/sdk";
import { createSSEResponse, getClientCounts, broadcastToUser } from "./sse";
import { getChatAgent } from "../services/agent";

// Get config from environment
const API_KEY = process.env.MENTRAOS_API_KEY || "";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "";
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY;

export const api = new Hono<{ Variables: AuthVariables }>();

// Apply SDK auth middleware to protected routes
if (API_KEY) {
  api.use(
    "/me",
    createAuthMiddleware({
      apiKey: API_KEY,
      packageName: PACKAGE_NAME,
      cookieSecret: COOKIE_SECRET,
    }),
  );

  api.use(
    "/profile",
    createAuthMiddleware({
      apiKey: API_KEY,
      packageName: PACKAGE_NAME,
      cookieSecret: COOKIE_SECRET,
    }),
  );

  api.use(
    "/agent/*",
    createAuthMiddleware({
      apiKey: API_KEY,
      packageName: PACKAGE_NAME,
      cookieSecret: COOKIE_SECRET,
    }),
  );
}

// ===========================================================================
// Health & Info
// ===========================================================================

api.get("/health", (c: Context) => {
  const clients = getClientCounts();

  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    sseClients: clients,
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

  return c.json({
    authenticated: true,
    userId,
  });
});

// ===========================================================================
// SSE Stream - Real-time updates to frontend
// ===========================================================================

api.get("/events", (c: Context) => {
  const userId = c.req.query("userId") || "anonymous";
  return createSSEResponse(c, userId);
});

// ===========================================================================
// ChatAgent Endpoints
// ===========================================================================

/**
 * Submit a query to the ChatAgent
 *
 * POST /api/agent/query
 * Body: { query: string }
 */
// ===========================================================================
// User Profile Endpoints
// ===========================================================================

/**
 * Get user profile
 *
 * GET /api/profile
 */
api.get("/profile", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const agent = getChatAgent(userId);
    const profile = agent.getProfile();

    return c.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("[API] Profile get error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

/**
 * Update user profile (from onboarding)
 *
 * POST /api/profile
 * Body: UserProfile fields
 */
api.post("/profile", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const agent = getChatAgent(userId);

    // Update agent profile
    agent.setProfile({
      name: body.name,
      role: body.role,
      company: body.company,
      email: body.email,
      interests: body.interests || [],
      listenFor: body.listenFor || [],
      researchFocus: body.researchFocus || [],
      noteStyle: body.noteStyle,
      customInstructions: body.customInstructions,
    });

    // TODO: Persist to MongoDB

    return c.json({
      success: true,
      message: "Profile updated",
      profile: agent.getProfile(),
    });
  } catch (error) {
    console.error("[API] Profile update error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// ===========================================================================
// ChatAgent Endpoints
// ===========================================================================

/**
 * Submit a query to the ChatAgent
 *
 * POST /api/agent/query
 * Body: { query: string }
 */
api.post("/agent/query", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const query = body.query as string;

  if (!query || query.trim() === "") {
    return c.json({ error: "query is required" }, 400);
  }

  try {
    // Get agent for this user
    const agent = getChatAgent(userId);

    // Process the query
    const response = await agent.processQuery(query.trim());

    return c.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("[API] Agent query error:", error);
    return c.json(
      {
        error: "Failed to process query",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

/**
 * Clear agent conversation history
 *
 * POST /api/agent/clear
 */
api.post("/agent/clear", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const agent = getChatAgent(userId);
    agent.clearHistory();

    return c.json({
      success: true,
      message: "Conversation history cleared",
    });
  } catch (error) {
    console.error("[API] Agent clear error:", error);
    return c.json({ error: "Failed to clear history" }, 500);
  }
});

/**
 * Get agent conversation history
 *
 * GET /api/agent/history
 */
api.get("/agent/history", async (c: Context) => {
  // @ts-ignore - Set by SDK auth middleware
  const userId = c.get("authUserId") as string | undefined;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const agent = getChatAgent(userId);
    const history = agent.getHistory();

    return c.json({
      success: true,
      history: history.map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === "string" ? msg.content : "[Complex content]",
      })),
    });
  } catch (error) {
    console.error("[API] Agent history error:", error);
    return c.json({ error: "Failed to get history" }, 500);
  }
});

// ===========================================================================
// Example Endpoints - Replace with your hackathon logic
// ===========================================================================

api.post("/example", async (c: Context) => {
  const body = await c.req.json();

  console.log("[API] Example endpoint called:", body);

  return c.json({
    success: true,
    message: "Example endpoint",
    received: body,
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
