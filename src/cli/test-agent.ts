#!/usr/bin/env bun
/**
 * CLI Tool: Test Agent
 *
 * Tests the AgentManager's analysis capabilities including:
 * - Meeting detection
 * - Meeting classification
 * - Command parsing
 * - Sensitive content detection
 *
 * Usage:
 *   bun run src/cli/test-agent.ts
 *   bun run src/cli/test-agent.ts --test-detection
 *   bun run src/cli/test-agent.ts --test-commands
 *   bun run src/cli/test-agent.ts --interactive
 */

import { AgentManager, type AgentManagerDeps } from "../app/session/AgentManager";
import { SettingsManager } from "../app/session/SettingsManager";
import type { TranscriptSegment, MeetingCategory } from "../app/session/types";

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

function createMockTranscript() {
  const segments: TranscriptSegment[] = [];
  let currentIndex = 0;

  return {
    segments,
    addSegment(text: string, isFinal: boolean = true): TranscriptSegment {
      const segment: TranscriptSegment = {
        text,
        timestamp: new Date(),
        isFinal,
        index: currentIndex++,
      };
      segments.push(segment);
      return segment;
    },
    getRecentSegments(count?: number, finalOnly: boolean = false): TranscriptSegment[] {
      let filtered = finalOnly ? segments.filter((s) => s.isFinal) : segments;
      if (count) {
        filtered = filtered.slice(-count);
      }
      return filtered;
    },
    getRecentText(count?: number, finalOnly: boolean = true): string {
      return this.getRecentSegments(count, finalOnly)
        .map((s) => s.text)
        .join(" ");
    },
    getCurrentIndex(): number {
      return currentIndex;
    },
    clear() {
      segments.length = 0;
      currentIndex = 0;
    },
  };
}

function createMockMeeting() {
  let activeMeeting: {
    _id: string;
    title: string;
    category: MeetingCategory;
    topics: string[];
    attendees: string[];
    isSensitive: boolean;
  } | null = null;

  return {
    isInMeeting: () => activeMeeting !== null,
    getActiveMeeting: () => activeMeeting,
    startMeeting: async (options: {
      title: string;
      category: MeetingCategory;
      confidence: number;
      attendees?: string[];
      presetId?: string;
      isSensitive?: boolean;
      sensitiveReason?: string;
    }) => {
      activeMeeting = {
        _id: `meeting_${Date.now()}`,
        title: options.title,
        category: options.category,
        topics: [],
        attendees: options.attendees || [],
        isSensitive: options.isSensitive || false,
      };
      console.log(`  [MEETING] Started: ${options.title} (${options.category})`);
      return activeMeeting;
    },
    endMeeting: async () => {
      const ended = activeMeeting;
      if (ended) {
        console.log(`  [MEETING] Ended: ${ended.title}`);
      }
      activeMeeting = null;
      return ended;
    },
    addTopics: async (topics: string[]) => {
      if (activeMeeting) {
        activeMeeting.topics.push(...topics);
        console.log(`  [MEETING] Added topics: ${topics.join(", ")}`);
      }
    },
    addAttendees: async (attendees: string[]) => {
      if (activeMeeting) {
        activeMeeting.attendees.push(...attendees);
        console.log(`  [MEETING] Added attendees: ${attendees.join(", ")}`);
      }
    },
    markAsSensitive: async (reason: string) => {
      if (activeMeeting) {
        activeMeeting.isSensitive = true;
        console.log(`  [MEETING] Marked sensitive: ${reason}`);
      }
    },
  };
}

function createMockSettings() {
  const settingsManager = new SettingsManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    display: {
      enableTranscript: () => {},
      disableTranscript: () => {},
    },
  });

  // Load default presets
  (settingsManager as any).loadSystemPresets();
  (settingsManager as any).loadDefaultSensitiveTopics();

  return settingsManager;
}

function createMockBroadcast() {
  return {
    sendStateChange: (prev: string, next: string) => {
      console.log(`  [STATE] ${prev} -> ${next}`);
    },
    broadcast: (data: Record<string, unknown>) => {
      console.log(`  [BROADCAST] ${data.type}:`, JSON.stringify(data, null, 2).substring(0, 200));
    },
  };
}

function createMockDisplay() {
  return {
    showMessage: (text: string, options?: { duration?: number; priority?: string }) => {
      console.log(`  [DISPLAY] ${text}`);
    },
    showProcessing: () => {
      console.log(`  [DISPLAY] Processing...`);
    },
    showNotification: (text: string) => {
      console.log(`  [NOTIFICATION] ${text}`);
    },
  };
}

function createMockNotes() {
  return {
    generateNotes: async (meetingId: string) => {
      console.log(`  [NOTES] Generating notes for meeting: ${meetingId}`);
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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Test Cases
// =============================================================================

async function testMeetingDetection() {
  printSection("Testing Meeting Detection");

  const mockTranscript = createMockTranscript();
  const mockMeeting = createMockMeeting();
  const mockSettings = createMockSettings();

  const agent = new AgentManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    transcript: mockTranscript,
    meeting: mockMeeting,
    settings: mockSettings,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
    notes: createMockNotes(),
  });

  console.log("\n  Simulating investor meeting transcript...");

  const investorMeetingPhrases = [
    "Hi everyone, thanks for joining today's investor update call.",
    "I'm excited to share our Q4 results with you.",
    "We've seen tremendous growth this quarter.",
    "Our revenue increased by 150% compared to last quarter.",
    "We're now at $2.5 million ARR.",
    "Our user base has grown to 50,000 active users.",
    "We're planning to raise our Series A in Q1.",
    "Any questions about the metrics?",
  ];

  for (const phrase of investorMeetingPhrases) {
    const segment = mockTranscript.addSegment(phrase);
    agent.onNewTranscript(segment);
    await sleep(100);
  }

  console.log("\n  Current transcript:");
  console.log(`  "${mockTranscript.getRecentText()}"`);

  console.log("\n  Agent state: " + agent.getState());

  // Wait for analysis to potentially run
  console.log("\n  Waiting for analysis...");
  await sleep(6000);

  console.log("  Agent state after analysis: " + agent.getState());
  console.log("  In meeting: " + mockMeeting.isInMeeting());

  if (mockMeeting.isInMeeting()) {
    const meeting = mockMeeting.getActiveMeeting();
    console.log(`  Meeting title: ${meeting?.title}`);
    console.log(`  Meeting category: ${meeting?.category}`);
  }

  agent.dispose();
  mockSettings.dispose();
  console.log("\n  ✅ Meeting detection test complete");
}

async function testCommandParsing() {
  printSection("Testing Command Parsing");

  const mockTranscript = createMockTranscript();
  const mockMeeting = createMockMeeting();
  const mockSettings = createMockSettings();

  const agent = new AgentManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    transcript: mockTranscript,
    meeting: mockMeeting,
    settings: mockSettings,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
    notes: createMockNotes(),
  });

  console.log("\n  Testing trigger keyword detection...");

  const commandPhrases = [
    "We're discussing the new product launch.",
    "Hey SEGA, research the competitor Acme Corp.",
    "Let's continue with the agenda.",
    "SEGA, take note of the decision to launch in March.",
    "That's a great point about the market.",
    "Okay SEGA, remind me to follow up with John.",
  ];

  for (const phrase of commandPhrases) {
    console.log(`\n  Input: "${phrase}"`);
    const segment = mockTranscript.addSegment(phrase);
    agent.onNewTranscript(segment);
    await sleep(200);
  }

  console.log("\n  Waiting for command processing...");
  await sleep(6000);

  console.log("\n  Pending commands:", agent.getPendingCommands());

  agent.dispose();
  mockSettings.dispose();
  console.log("\n  ✅ Command parsing test complete");
}

async function testSensitiveContentDetection() {
  printSection("Testing Sensitive Content Detection");

  const mockTranscript = createMockTranscript();
  const mockMeeting = createMockMeeting();
  const mockSettings = createMockSettings();

  const agent = new AgentManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    transcript: mockTranscript,
    meeting: mockMeeting,
    settings: mockSettings,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
    notes: createMockNotes(),
  });

  // Start a meeting first
  await mockMeeting.startMeeting({
    title: "HR Discussion",
    category: "one_on_one",
    confidence: 1.0,
  });

  console.log("\n  Simulating conversation with sensitive content...");

  const sensitivePhrases = [
    "Let's discuss your performance this quarter.",
    "I wanted to talk about your compensation.",
    "We're considering a salary increase for you.",
    "Also, there have been some layoffs in other departments.",
    "Your job is safe, don't worry.",
    "Let's discuss your equity package.",
  ];

  for (const phrase of sensitivePhrases) {
    console.log(`\n  Input: "${phrase}"`);
    const segment = mockTranscript.addSegment(phrase);
    agent.onNewTranscript(segment);
    await sleep(200);
  }

  console.log("\n  Agent paused: " + agent.getIsPaused());
  console.log("  Meeting is sensitive: " + mockMeeting.getActiveMeeting()?.isSensitive);

  agent.dispose();
  mockSettings.dispose();
  console.log("\n  ✅ Sensitive content detection test complete");
}

async function testManualMeetingControl() {
  printSection("Testing Manual Meeting Control");

  const mockTranscript = createMockTranscript();
  const mockMeeting = createMockMeeting();
  const mockSettings = createMockSettings();

  const agent = new AgentManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    transcript: mockTranscript,
    meeting: mockMeeting,
    settings: mockSettings,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
    notes: createMockNotes(),
  });

  console.log("\n  Manually starting meeting...");
  await agent.manualStartMeeting("Product Planning Session", "team_standup");

  console.log("  Agent state: " + agent.getState());
  console.log("  In meeting: " + mockMeeting.isInMeeting());

  // Add some transcript
  const phrases = [
    "Let's plan the next sprint.",
    "We need to prioritize the authentication feature.",
    "The deadline is next Friday.",
  ];

  for (const phrase of phrases) {
    const segment = mockTranscript.addSegment(phrase);
    agent.onNewTranscript(segment);
  }

  console.log("\n  Manually ending meeting...");
  await agent.manualEndMeeting();

  console.log("  Agent state: " + agent.getState());
  console.log("  In meeting: " + mockMeeting.isInMeeting());

  agent.dispose();
  mockSettings.dispose();
  console.log("\n  ✅ Manual meeting control test complete");
}

async function testAutonomyLevels() {
  printSection("Testing Autonomy Levels");

  for (const level of ["capture_only", "suggest", "act"] as const) {
    console.log(`\n  --- Testing autonomy level: ${level} ---`);

    const mockTranscript = createMockTranscript();
    const mockMeeting = createMockMeeting();
    const mockSettings = createMockSettings();

    // Set autonomy level
    await mockSettings.updateSettings({ autonomyLevel: level });

    const agent = new AgentManager({
      userId: "test@example.com",
      logger: createMockLogger(),
      transcript: mockTranscript,
      meeting: mockMeeting,
      settings: mockSettings,
      broadcast: createMockBroadcast(),
      display: createMockDisplay(),
      notes: createMockNotes(),
    });

    // Simulate meeting start
    const phrases = [
      "Welcome everyone to our board meeting.",
      "Today we'll discuss the company strategy.",
      "Let's start with the financial report.",
    ];

    for (const phrase of phrases) {
      const segment = mockTranscript.addSegment(phrase);
      agent.onNewTranscript(segment);
    }

    // Wait for analysis
    await sleep(6000);

    console.log(`  Autonomy: ${level}`);
    console.log(`  In meeting: ${mockMeeting.isInMeeting()}`);
    console.log(`  Pending commands: ${agent.getPendingCommands().length}`);

    agent.dispose();
    mockSettings.dispose();
  }

  console.log("\n  ✅ Autonomy levels test complete");
}

async function interactiveMode() {
  printSection("Interactive Agent Test Mode");

  const mockTranscript = createMockTranscript();
  const mockMeeting = createMockMeeting();
  const mockSettings = createMockSettings();

  const agent = new AgentManager({
    userId: "test@example.com",
    logger: createMockLogger(),
    transcript: mockTranscript,
    meeting: mockMeeting,
    settings: mockSettings,
    broadcast: createMockBroadcast(),
    display: createMockDisplay(),
    notes: createMockNotes(),
  });

  // Start the analysis loop
  agent.start();

  console.log("\n  Interactive mode started. Commands:");
  console.log("    Type any text to simulate transcription");
  console.log("    /start <title> - Manually start meeting");
  console.log("    /end - Manually end meeting");
  console.log("    /state - Show current state");
  console.log("    /pending - Show pending commands");
  console.log("    /confirm - Confirm pending action");
  console.log("    /pause - Pause agent");
  console.log("    /resume - Resume agent");
  console.log("    /quit - Exit interactive mode");
  console.log("");

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("> ", async (input) => {
      const trimmed = input.trim();

      if (trimmed.startsWith("/")) {
        const parts = trimmed.split(" ");
        const cmd = parts[0];

        switch (cmd) {
          case "/start":
            const title = parts.slice(1).join(" ") || "Untitled Meeting";
            await agent.manualStartMeeting(title, "unknown");
            break;
          case "/end":
            await agent.manualEndMeeting();
            break;
          case "/state":
            console.log(`  State: ${agent.getState()}`);
            console.log(`  In meeting: ${mockMeeting.isInMeeting()}`);
            console.log(`  Paused: ${agent.getIsPaused()}`);
            break;
          case "/pending":
            console.log(`  Pending commands:`, agent.getPendingCommands());
            break;
          case "/confirm":
            await agent.confirmPendingAction();
            break;
          case "/pause":
            agent.pause("Manual pause");
            break;
          case "/resume":
            agent.resume();
            break;
          case "/quit":
            agent.dispose();
            mockSettings.dispose();
            rl.close();
            console.log("\n  Goodbye!");
            return;
          default:
            console.log(`  Unknown command: ${cmd}`);
        }
      } else if (trimmed) {
        const segment = mockTranscript.addSegment(trimmed);
        agent.onNewTranscript(segment);
        console.log(`  [Transcript added: ${mockTranscript.getCurrentIndex()} segments total]`);
      }

      prompt();
    });
  };

  prompt();
}

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  printHeader("SEGA Agent Test CLI");

  if (args.includes("--interactive")) {
    await interactiveMode();
    return;
  }

  if (args.includes("--test-detection")) {
    await testMeetingDetection();
  } else if (args.includes("--test-commands")) {
    await testCommandParsing();
  } else if (args.includes("--test-sensitive")) {
    await testSensitiveContentDetection();
  } else if (args.includes("--test-manual")) {
    await testManualMeetingControl();
  } else if (args.includes("--test-autonomy")) {
    await testAutonomyLevels();
  } else {
    // Run all tests
    await testMeetingDetection();
    await testCommandParsing();
    await testSensitiveContentDetection();
    await testManualMeetingControl();
    // await testAutonomyLevels(); // Skip this one as it takes a while
  }

  printHeader("All Tests Complete! ✅");
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
