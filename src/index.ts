/**
 * SEGA - Smart Executive Glasses Assistant
 *
 * An AI-powered executive assistant for smart glasses that:
 * - Listens to meetings and conversations
 * - Detects and classifies meetings automatically
 * - Takes smart, contextual notes
 * - Performs deep research using Firecrawl
 * - Sends summaries and reports via Resend
 */

import { SegaApp } from "./app";
import { api } from "./api/router";
import { createMentraAuthRoutes } from "@mentra/sdk";
import indexDev from "./webview/index.html";
import indexProd from "./webview/index.prod.html";

// Configuration from environment
const PORT = parseInt(process.env.PORT || "3000", 10);
const PACKAGE_NAME = process.env.PACKAGE_NAME;
const API_KEY = process.env.MENTRAOS_API_KEY;
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY;

// Validate required environment variables
if (!PACKAGE_NAME) {
  console.error("❌ PACKAGE_NAME environment variable is not set");
  process.exit(1);
}

if (!API_KEY) {
  console.error("❌ MENTRAOS_API_KEY environment variable is not set");
  process.exit(1);
}

// Check optional integrations
const hasFirecrawl = !!process.env.FIRECRAWL_API_KEY;
const hasResend = !!process.env.RESEND_API_KEY;
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasAI = hasGemini || hasAnthropic;
const hasMongoDB = !!process.env.MONGODB_URI;

console.log("🚀 Starting SEGA - Smart Executive Glasses Assistant\n");
console.log(`   Package: ${PACKAGE_NAME}`);
console.log(`   Port: ${PORT}`);
console.log("");
console.log("   Integrations:");
console.log(
  `   • AI Provider: ${hasAI ? (hasGemini ? "✅ Gemini" : "✅ Anthropic") : "❌ (Set GEMINI_API_KEY or ANTHROPIC_API_KEY)"}`,
);
console.log(
  `   • MongoDB:     ${hasMongoDB ? "✅" : "⚠️  (Optional - Set MONGODB_URI for persistence)"}`,
);
console.log(
  `   • Firecrawl:   ${hasFirecrawl ? "✅" : "⚠️  (Optional - Set FIRECRAWL_API_KEY for web research)"}`,
);
console.log(
  `   • Resend:      ${hasResend ? "✅" : "⚠️  (Optional - Set RESEND_API_KEY for email reports)"}`,
);
console.log("");

if (!hasAI) {
  console.error(
    "❌ No AI provider configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.",
  );
  process.exit(1);
}

// Initialize App (extends Hono via AppServer)
const app = new SegaApp({
  packageName: PACKAGE_NAME,
  apiKey: API_KEY,
  port: PORT,
  cookieSecret: COOKIE_SECRET,
});

// Mount Mentra auth routes for frontend token exchange
app.route(
  "/api/mentra/auth",
  createMentraAuthRoutes({
    apiKey: API_KEY,
    packageName: PACKAGE_NAME,
    cookieSecret: COOKIE_SECRET || "",
  }),
);

// Mount API routes
// @ts-ignore - Hono type compatibility
app.route("/api", api);

// Start the SDK app (registers SDK routes, checks version)
await app.start();

console.log(`✅ SEGA running at http://localhost:${PORT}`);
console.log(`   • Webview: http://localhost:${PORT}`);
console.log(`   • API: http://localhost:${PORT}/api/health`);
console.log("");

// Determine environment
const isDevelopment = process.env.NODE_ENV === "development";

// Start Bun server with HMR support
Bun.serve({
  port: PORT,
  idleTimeout: 120, // 2 minutes for SSE connections
  development: isDevelopment && {
    hmr: true,
    console: true,
  },
  routes: {
    // Serve webview at root
    "/": isDevelopment ? indexDev : indexProd,
    "/onboarding": isDevelopment ? indexDev : indexProd,
  },
  fetch(request) {
    // Handle all requests through Hono app
    return app.fetch(request);
  },
});

if (isDevelopment) {
  console.log(`🔥 HMR enabled for development`);
}
console.log("");

// Graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down SEGA...");
  await app.stop();
  console.log("👋 Goodbye!");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
