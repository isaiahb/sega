#!/usr/bin/env bun
/**
 * CLI Tool: Test Research
 *
 * Tests the ResearchManager's Firecrawl integration including:
 * - Web search and scraping
 * - Research synthesis
 * - Progress tracking
 *
 * Usage:
 *   bun run src/cli/test-research.ts
 *   bun run src/cli/test-research.ts --query "OpenAI company"
 *   bun run src/cli/test-research.ts --url "https://example.com"
 *   bun run src/cli/test-research.ts --quick "Sam Altman"
 */

import { ResearchManager, type ResearchManagerDeps } from "../app/session/ResearchManager";

// =============================================================================
// Mock Dependencies
// =============================================================================

function createMockLogger() {
  return {
    info: (msg: string, ...args: unknown[]) => console.log(`  [INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(`  [WARN] ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(`  [ERROR] ${msg}`, ...args),
  };
}

function createMockMeeting() {
  let activeMeetingId: string | undefined = undefined;
  const linkedResearch: string[] = [];

  return {
    isInMeeting: () => activeMeetingId !== undefined,
    getActiveMeetingId: () => activeMeetingId,
    linkResearch: async (researchId: string) => {
      linkedResearch.push(researchId);
      console.log(`  [MEETING] Linked research: ${researchId}`);
    },
    // Test helpers
    setActiveMeeting: (id: string) => {
      activeMeetingId = id;
    },
    getLinkedResearch: () => linkedResearch,
  };
}

function createMockBroadcast() {
  return {
    sendResearchProgress: (
      researchId: string,
      query: string,
      progress: number,
      currentStep: string
    ) => {
      const bar = makeProgressBar(progress);
      console.log(`  [PROGRESS] ${bar} ${currentStep}`);
    },
    broadcast: (data: Record<string, unknown>) => {
      if (data.type === "research_complete") {
        console.log(`\n  [BROADCAST] Research complete!`);
        console.log(`    Summary: ${(data.summary as string)?.substring(0, 100)}...`);
      }
    },
  };
}

function createMockDisplay() {
  return {
    showResearchProgress: (query: string, progress: number) => {
      // Already shown in broadcast
    },
    showResearchComplete: (summary: string) => {
      console.log(`\n  📱 [GLASSES] Research complete!`);
    },
    showError: (message: string) => {
      console.log(`  📱 [GLASSES ERROR] ${message}`);
    },
    showMessage: (text: string, options?: { duration?: number }) => {
      console.log(`  📱 [GLASSES] ${text}`);
    },
  };
}

// =============================================================================
// Test Utilities
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

function makeProgressBar(progress: number): string {
  const filled = Math.round(progress / 5);
  const empty = 20 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Test Cases
// =============================================================================

async function testResearchAvailability() {
  printSection("Testing Research Availability");

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: createMockMeeting(),
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  console.log(`\n  Firecrawl available: ${manager.isAvailable()}`);

  if (!manager.isAvailable()) {
    console.log("  ⚠️  Set FIRECRAWL_API_KEY to enable research features");
  }

  manager.dispose();
  console.log("\n  ✅ Availability check complete");
}

async function testFullResearch(query: string, type: "person" | "company" | "topic" | "general" = "general") {
  printSection(`Testing Full Research: "${query}"`);

  const mockMeeting = createMockMeeting();
  mockMeeting.setActiveMeeting("test_meeting_123");

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: mockMeeting,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  if (!manager.isAvailable()) {
    console.log("\n  ⚠️  Firecrawl not available - skipping test");
    console.log("  Set FIRECRAWL_API_KEY to run this test");
    manager.dispose();
    return;
  }

  console.log(`\n  Starting research for: "${query}" (type: ${type})`);
  console.log("  This may take 30-60 seconds...\n");

  const startTime = Date.now();
  const result = await manager.startResearch(query, type);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result) {
    console.log("\n" + "=".repeat(50));
    console.log("  RESEARCH RESULTS");
    console.log("=".repeat(50));
    console.log(`\n  Query: ${result.query}`);
    console.log(`  Type: ${result.type}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Sources: ${result.sources.length}`);
    console.log(`\n  Summary:\n  ${result.summary}`);
    console.log(`\n  Key Facts:`);
    result.keyFacts.forEach((fact, i) => {
      console.log(`    ${i + 1}. ${fact}`);
    });
    console.log(`\n  Sources:`);
    result.sources.slice(0, 5).forEach((source, i) => {
      console.log(`    ${i + 1}. ${source.title}`);
      console.log(`       ${source.url}`);
    });

    // Check if linked to meeting
    console.log(`\n  Linked to meeting: ${mockMeeting.getLinkedResearch().length > 0}`);
  } else {
    console.log("\n  ❌ Research failed or returned no results");
  }

  manager.dispose();
  console.log("\n  ✅ Full research test complete");
}

async function testUrlScrape(url: string) {
  printSection(`Testing URL Scrape: ${url}`);

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: createMockMeeting(),
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  if (!manager.isAvailable()) {
    console.log("\n  ⚠️  Firecrawl not available - skipping test");
    manager.dispose();
    return;
  }

  console.log(`\n  Scraping URL: ${url}`);

  const result = await manager.scrapeUrl(url);

  if (result) {
    console.log(`\n  Title: ${result.title}`);
    console.log(`  Content length: ${result.content.length} characters`);
    console.log(`\n  Content preview:`);
    console.log(`  ${result.content.substring(0, 500)}...`);
  } else {
    console.log("\n  ❌ Scrape failed");
  }

  manager.dispose();
  console.log("\n  ✅ URL scrape test complete");
}

async function testQuickResearch(query: string) {
  printSection(`Testing Quick Research: "${query}"`);

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: createMockMeeting(),
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  if (!manager.isAvailable()) {
    console.log("\n  ⚠️  Firecrawl not available - skipping test");
    manager.dispose();
    return;
  }

  console.log(`\n  Running quick research for: "${query}"`);

  const facts = await manager.quickResearch(query);

  if (facts.length > 0) {
    console.log(`\n  Key Facts Found:`);
    facts.forEach((fact, i) => {
      console.log(`    ${i + 1}. ${fact}`);
    });
  } else {
    console.log("\n  No facts found");
  }

  manager.dispose();
  console.log("\n  ✅ Quick research test complete");
}

async function testResearchWithMeeting() {
  printSection("Testing Research During Meeting");

  const mockMeeting = createMockMeeting();
  mockMeeting.setActiveMeeting("meeting_abc123");

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: mockMeeting,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  if (!manager.isAvailable()) {
    console.log("\n  ⚠️  Firecrawl not available - skipping test");
    manager.dispose();
    return;
  }

  console.log("\n  Simulating research during a meeting...");
  console.log("  Meeting ID: meeting_abc123");

  const result = await manager.startResearch("Mentra smart glasses", "company");

  if (result) {
    console.log(`\n  Research ID: ${result._id}`);
    console.log(`  Meeting ID in result: ${result.meetingId}`);
    console.log(`  Linked to meeting: ${mockMeeting.getLinkedResearch().includes(result._id!)}`);
  }

  manager.dispose();
  console.log("\n  ✅ Research with meeting test complete");
}

async function testConcurrentResearch() {
  printSection("Testing Concurrent Research");

  const manager = new ResearchManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    meeting: createMockMeeting(),
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
  });

  if (!manager.isAvailable()) {
    console.log("\n  ⚠️  Firecrawl not available - skipping test");
    manager.dispose();
    return;
  }

  console.log("\n  Starting multiple concurrent research queries...");

  const queries = ["Apple Inc", "Tesla Motors", "SpaceX"];

  const promises = queries.map((q) =>
    manager.startResearch(q, "company").then((r) => ({
      query: q,
      success: !!r,
      sources: r?.sources.length || 0,
    }))
  );

  console.log(`  Active research: ${manager.getActiveResearch().length}`);
  console.log("  Is researching: " + manager.isResearching());

  const results = await Promise.all(promises);

  console.log("\n  Results:");
  results.forEach((r) => {
    console.log(`    ${r.query}: ${r.success ? "✅" : "❌"} (${r.sources} sources)`);
  });

  manager.dispose();
  console.log("\n  ✅ Concurrent research test complete");
}

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  printHeader("SEGA Research Test CLI");

  // Check for Firecrawl API key
  if (!process.env.FIRECRAWL_API_KEY) {
    console.log("  ⚠️  FIRECRAWL_API_KEY not set");
    console.log("  Some tests will be skipped.\n");
  }

  // Parse arguments
  const queryIndex = args.indexOf("--query");
  const urlIndex = args.indexOf("--url");
  const quickIndex = args.indexOf("--quick");
  const typeIndex = args.indexOf("--type");

  const query = queryIndex >= 0 ? args[queryIndex + 1] : undefined;
  const url = urlIndex >= 0 ? args[urlIndex + 1] : undefined;
  const quick = quickIndex >= 0 ? args[quickIndex + 1] : undefined;
  const type = typeIndex >= 0 ? args[typeIndex + 1] as "person" | "company" | "topic" | "general" : "general";

  if (query) {
    await testFullResearch(query, type);
  } else if (url) {
    await testUrlScrape(url);
  } else if (quick) {
    await testQuickResearch(quick);
  } else if (args.includes("--concurrent")) {
    await testConcurrentResearch();
  } else if (args.includes("--meeting")) {
    await testResearchWithMeeting();
  } else {
    // Run basic tests
    await testResearchAvailability();

    if (process.env.FIRECRAWL_API_KEY) {
      // Only run full tests if API key is available
      await testQuickResearch("Mentra smart glasses company");
      // Skip full research in default run to save API calls
      // await testFullResearch("Mentra smart glasses", "company");
    }
  }

  printHeader("All Tests Complete! ✅");
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
