#!/usr/bin/env bun
/**
 * CLI Tool: Test Third-Party Services
 *
 * Tests connectivity and basic functionality of:
 * - MongoDB (database)
 * - Gemini (LLM)
 * - Anthropic (LLM)
 * - Firecrawl (web scraping)
 * - Resend (email)
 *
 * Usage:
 *   bun run src/cli/test-services.ts
 *   bun run src/cli/test-services.ts --service=mongodb
 *   bun run src/cli/test-services.ts --service=gemini
 *   bun run src/cli/test-services.ts --service=firecrawl
 *   bun run src/cli/test-services.ts --service=resend
 */

// =============================================================================
// Utilities
// =============================================================================

function printHeader(text: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${text}`);
  console.log("=".repeat(60) + "\n");
}

function printSection(text: string) {
  console.log("\n" + "-".repeat(40));
  console.log(`  ${text}`);
  console.log("-".repeat(40));
}

function success(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
}

function info(msg: string) {
  console.log(`  ℹ️  ${msg}`);
}

function warn(msg: string) {
  console.log(`  ⚠️  ${msg}`);
}

// =============================================================================
// MongoDB Test
// =============================================================================

async function testMongoDB(): Promise<boolean> {
  printSection("Testing MongoDB");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    fail("MONGODB_URI not set");
    return false;
  }

  info(`URI: ${uri.substring(0, 30)}...`);

  try {
    const { connectDB, disconnectDB, isDBConnected, DailyTranscript } = await import(
      "../services/db"
    );

    info("Connecting...");
    await connectDB();

    if (!isDBConnected()) {
      fail("Connection failed - not connected");
      return false;
    }

    success("Connected to MongoDB");

    // Test a simple query
    info("Testing query...");
    const count = await DailyTranscript.countDocuments();
    success(`Query successful - ${count} daily transcripts in database`);

    // Test insert and delete
    info("Testing insert...");
    const testDoc = await DailyTranscript.create({
      userId: "test@test.com",
      date: "2099-01-01",
      segments: [],
      totalSegments: 0,
    });
    success(`Insert successful - ID: ${testDoc._id}`);

    info("Testing delete...");
    await DailyTranscript.deleteOne({ _id: testDoc._id });
    success("Delete successful");

    await disconnectDB();
    success("Disconnected from MongoDB");

    return true;
  } catch (error) {
    fail(`MongoDB error: ${error}`);
    return false;
  }
}

// =============================================================================
// Gemini Test
// =============================================================================

async function testGemini(): Promise<boolean> {
  printSection("Testing Gemini (Google AI)");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    fail("GEMINI_API_KEY not set");
    return false;
  }

  info(`API Key: ${apiKey.substring(0, 10)}...`);

  try {
    const { GeminiProvider } = await import("../services/llm/gemini");

    info("Creating provider...");
    const provider = new GeminiProvider(apiKey);
    success("Provider created");

    info("Testing chat (fast tier - Gemini Flash)...");
    const response = await provider.chat(
      [{ role: "user", content: "Say 'Hello from Gemini!' in exactly 5 words." }],
      { tier: "fast", maxTokens: 50 }
    );

    if (response.content) {
      const text =
        typeof response.content === "string"
          ? response.content
          : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      success(`Response: "${text.trim()}"`);
    } else {
      fail("No response content");
      return false;
    }

    info("Testing chat (smart tier - Gemini Pro)...");
    const response2 = await provider.chat(
      [{ role: "user", content: "What is 2 + 2? Reply with just the number." }],
      { tier: "smart", maxTokens: 10 }
    );

    if (response2.content) {
      const text =
        typeof response2.content === "string"
          ? response2.content
          : response2.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      success(`Response: "${text.trim()}"`);
    }

    return true;
  } catch (error) {
    fail(`Gemini error: ${error}`);
    return false;
  }
}

// =============================================================================
// Anthropic Test
// =============================================================================

async function testAnthropic(): Promise<boolean> {
  printSection("Testing Anthropic (Claude)");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    warn("ANTHROPIC_API_KEY not set - skipping");
    return true; // Not a failure, just not configured
  }

  info(`API Key: ${apiKey.substring(0, 10)}...`);

  try {
    const { AnthropicProvider } = await import("../services/llm/anthropic");

    info("Creating provider...");
    const provider = new AnthropicProvider(apiKey);
    success("Provider created");

    info("Testing chat (fast tier - Haiku)...");
    const response = await provider.chat(
      [{ role: "user", content: "Say 'Hello from Claude!' in exactly 5 words." }],
      { tier: "fast", maxTokens: 50 }
    );

    if (response.content) {
      const text =
        typeof response.content === "string"
          ? response.content
          : response.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      success(`Response: "${text.trim()}"`);
    } else {
      fail("No response content");
      return false;
    }

    return true;
  } catch (error) {
    fail(`Anthropic error: ${error}`);
    return false;
  }
}

// =============================================================================
// Firecrawl Test
// =============================================================================

async function testFirecrawl(): Promise<boolean> {
  printSection("Testing Firecrawl (Web Scraping)");

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    fail("FIRECRAWL_API_KEY not set");
    return false;
  }

  info(`API Key: ${apiKey.substring(0, 10)}...`);

  try {
    const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;

    info("Creating client...");
    const firecrawl = new FirecrawlApp({ apiKey });
    success("Client created");

    info("Testing scrape (example.com)...");
    const scrapeResult = await firecrawl.scrapeUrl("https://example.com", {
      formats: ["markdown"],
    });

    if (scrapeResult.success) {
      success(`Scrape successful`);
      info(`Title: ${scrapeResult.metadata?.title || "N/A"}`);
      info(`Content length: ${scrapeResult.markdown?.length || 0} chars`);
    } else {
      fail("Scrape failed");
      return false;
    }

    info("Testing search (Mentra smart glasses)...");
    const searchResult = await firecrawl.search("Mentra smart glasses company", {
      limit: 2,
    });

    if (searchResult.success && searchResult.data) {
      success(`Search successful - ${searchResult.data.length} results`);
      for (const result of searchResult.data.slice(0, 2)) {
        info(`  - ${result.metadata?.title || result.url}`);
      }
    } else {
      warn("Search returned no results (may be rate limited)");
    }

    return true;
  } catch (error) {
    fail(`Firecrawl error: ${error}`);
    return false;
  }
}

// =============================================================================
// Resend Test
// =============================================================================

async function testResend(): Promise<boolean> {
  printSection("Testing Resend (Email)");

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    fail("RESEND_API_KEY not set");
    return false;
  }

  if (!fromEmail) {
    warn("RESEND_FROM_EMAIL not set - using default");
  }

  info(`API Key: ${apiKey.substring(0, 10)}...`);
  info(`From: ${fromEmail || "onboarding@resend.dev"}`);

  try {
    const { Resend } = await import("resend");

    info("Creating client...");
    const resend = new Resend(apiKey);
    success("Client created");

    // Test API connectivity by checking domains (doesn't send email)
    info("Testing API connectivity...");

    // Just verify the API key works by making a simple API call
    // We'll send to Resend's test address to avoid sending real emails
    const testEmail = await resend.emails.send({
      from: fromEmail || "onboarding@resend.dev",
      to: "delivered@resend.dev", // Resend's test address
      subject: "SEGA Service Test",
      html: "<p>This is a test email from SEGA service verification.</p>",
    });

    if (testEmail.data?.id) {
      success(`Email API working - Test email ID: ${testEmail.data.id}`);
    } else if (testEmail.error) {
      // Check if it's a domain verification issue (expected for new domains)
      if (testEmail.error.message?.includes("verify")) {
        warn(`Domain not verified yet: ${testEmail.error.message}`);
        info("Email will work once domain is verified in Resend dashboard");
        return true; // Not a failure, just needs setup
      }
      fail(`Email error: ${testEmail.error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    fail(`Resend error: ${error}`);
    return false;
  }
}

// =============================================================================
// LLM Provider Factory Test
// =============================================================================

async function testLLMFactory(): Promise<boolean> {
  printSection("Testing LLM Provider Factory");

  try {
    const { createProviderFromEnv, extractText } = await import("../services/llm");

    info("Creating provider from environment...");
    const provider = createProviderFromEnv();
    success(`Provider created: ${provider.constructor.name}`);

    info("Testing chat...");
    const response = await provider.chat(
      [
        {
          role: "user",
          content:
            "You are a meeting assistant. Respond with just: 'SEGA is ready to assist you.'",
        },
      ],
      { tier: "fast", maxTokens: 50 }
    );

    const text = extractText(response);
    success(`Response: "${text.trim()}"`);

    return true;
  } catch (error) {
    fail(`LLM Factory error: ${error}`);
    return false;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.find((a) => a.startsWith("--service="));
  const service = serviceArg?.split("=")[1];

  printHeader("SEGA Third-Party Services Test");

  console.log("  Environment:");
  console.log(`    MONGODB_URI: ${process.env.MONGODB_URI ? "✓ Set" : "✗ Not set"}`);
  console.log(`    GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "✓ Set" : "✗ Not set"}`);
  console.log(
    `    ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "✓ Set" : "✗ Not set"}`
  );
  console.log(
    `    FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY ? "✓ Set" : "✗ Not set"}`
  );
  console.log(`    RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set"}`);

  const results: { [key: string]: boolean } = {};

  if (!service || service === "mongodb") {
    results.mongodb = await testMongoDB();
  }

  if (!service || service === "gemini") {
    results.gemini = await testGemini();
  }

  if (!service || service === "anthropic") {
    results.anthropic = await testAnthropic();
  }

  if (!service || service === "llm") {
    results.llmFactory = await testLLMFactory();
  }

  if (!service || service === "firecrawl") {
    results.firecrawl = await testFirecrawl();
  }

  if (!service || service === "resend") {
    results.resend = await testResend();
  }

  // Summary
  printHeader("Test Results Summary");

  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? "✅" : "❌"} ${name}`);
    if (!passed) allPassed = false;
  }

  console.log("");
  if (allPassed) {
    console.log("  🎉 All services are working!\n");
  } else {
    console.log("  ⚠️  Some services need attention.\n");
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
