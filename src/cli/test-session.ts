#!/usr/bin/env bun
/**
 * CLI Tool: Test Session
 *
 * Tests the UserSession and all managers without needing actual glasses.
 * Simulates transcription input and verifies manager behavior.
 *
 * Usage:
 *   bun run src/cli/test-session.ts
 *   bun run src/cli/test-session.ts --user test@example.com
 *   bun run src/cli/test-session.ts --simulate-meeting
 */

import { UserSession } from "../app/session/UserSession";
import { BroadcastManager } from "../app/session/BroadcastManager";
import { TranscriptManager } from "../app/session/TranscriptManager";
import { DisplayManager } from "../app/session/DisplayManager";
import { SettingsManager } from "../app/session/SettingsManager";
import { MeetingManager } from "../app/session/MeetingManager";

// =============================================================================
// Mock AppSession for testing without actual glasses
// =============================================================================

class MockAppSession {
  logger = {
    info: (msg: string) => console.log(`[MockAppSession] ${msg}`),
    warn: (msg: string) => console.warn(`[MockAppSession] ${msg}`),
    error: (msg: string) => console.error(`[MockAppSession] ${msg}`),
    debug: (msg: string) => console.debug(`[MockAppSession] ${msg}`),
  };

  capabilities = {
    modelName: "CLI Test Device",
    hasCamera: false,
    hasDisplay: true,
    hasMicrophone: true,
    hasSpeaker: true,
  };

  layouts = {
    showTextWall: (text: string, options?: { durationMs?: number }) => {
      console.log(`\n📱 [GLASSES DISPLAY]:`);
      console.log(`   "${text}"`);
      if (options?.durationMs) {
        console.log(`   (duration: ${options.durationMs}ms)`);
      }
      console.log();
    },
    showReferenceCard: (
      title: string,
      body: string,
      options?: { durationMs?: number }
    ) => {
      console.log(`\n📱 [GLASSES CARD]:`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log();
    },
  };

  events = {
    onTranscription: (handler: (data: any) => void) => {
      // Store handler for manual triggering
      (this as any)._transcriptionHandler = handler;
      return () => {};
    },
    onButtonPress: (handler: (data: any) => void) => {
      (this as any)._buttonHandler = handler;
      return () => {};
    },
  };

  audio = {
    speak: async (text: string) => {
      console.log(`🔊 [SPEAK]: "${text}"`);
    },
  };

  // Test helpers
  simulateTranscription(text: string, isFinal: boolean = true) {
    const handler = (this as any)._transcriptionHandler;
    if (handler) {
      handler({ text, isFinal, speakerId: "test-speaker" });
    }
  }

  simulateButtonPress(buttonId: string) {
    const handler = (this as any)._buttonHandler;
    if (handler) {
      handler({ buttonId });
    }
  }
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
// Test Functions
// =============================================================================

async function testTranscriptManager(userId: string) {
  printSection("Testing TranscriptManager");

  const mockLogger = {
    info: (msg: string) => console.log(`  [INFO] ${msg}`),
    error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  };

  const mockBroadcast = {
    sendTranscript: (text: string, isFinal: boolean, speakerHint?: string) => {
      console.log(
        `  [BROADCAST] Transcript: "${text}" (final: ${isFinal}, speaker: ${speakerHint || "unknown"})`
      );
    },
  };

  const manager = new TranscriptManager({
    userId,
    logger: mockLogger,
    broadcast: mockBroadcast,
  });

  // Add some segments
  console.log("\n  Adding transcript segments...");
  manager.addSegment("Hello, this is a test.", true, "speaker-1");
  manager.addSegment("We're testing the transcript manager.", true, "speaker-1");
  manager.addSegment("It should buffer and track segments.", true, "speaker-2");

  // Check buffer
  console.log(`\n  Buffer size: ${manager.getBufferSize()}`);
  console.log(`  Current index: ${manager.getCurrentIndex()}`);
  console.log(`  Current date: ${manager.getCurrentDate()}`);

  // Get recent text
  const recentText = manager.getRecentText(10, true);
  console.log(`\n  Recent text: "${recentText}"`);

  // Get segments in range
  const rangeText = manager.getTextInRange(0, 2);
  console.log(`  Text in range [0-2]: "${rangeText}"`);

  // Clean up
  await manager.dispose();
  console.log("\n  ✅ TranscriptManager test complete");
}

async function testMeetingManager(userId: string) {
  printSection("Testing MeetingManager");

  const mockLogger = {
    info: (msg: string) => console.log(`  [INFO] ${msg}`),
    error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  };

  const mockTranscript = {
    getCurrentDate: () => new Date().toISOString().split("T")[0],
    getCurrentIndex: () => 5,
    getTextInRange: (start: number, end?: number) =>
      `[Transcript from ${start} to ${end || "end"}]`,
  };

  const mockBroadcast = {
    sendMeetingStarted: (
      meetingId: string,
      title: string,
      category: string,
      startTime: Date
    ) => {
      console.log(
        `  [BROADCAST] Meeting started: ${title} (${category}) at ${startTime.toISOString()}`
      );
    },
    sendMeetingEnded: (meetingId: string, durationMs: number) => {
      console.log(
        `  [BROADCAST] Meeting ended: ${meetingId} (duration: ${durationMs}ms)`
      );
    },
    broadcast: (data: Record<string, unknown>) => {
      console.log(`  [BROADCAST] Event:`, data);
    },
  };

  const mockDisplay = {
    showMeetingStarted: (title: string, category: string) => {
      console.log(`  [DISPLAY] Meeting started: ${title} (${category})`);
    },
    showMeetingEnded: (duration: string) => {
      console.log(`  [DISPLAY] Meeting ended: ${duration}`);
    },
  };

  const manager = new MeetingManager({
    userId,
    logger: mockLogger,
    transcript: mockTranscript,
    broadcast: mockBroadcast,
    display: mockDisplay,
  });

  // Test meeting lifecycle
  console.log("\n  Starting a meeting...");
  const meeting = await manager.startMeeting({
    title: "Test Investor Call",
    category: "investor_update",
    confidence: 0.85,
    attendees: ["John Doe", "Jane Smith"],
  });

  console.log(`\n  Meeting created: ${meeting._id}`);
  console.log(`  Is in meeting: ${manager.isInMeeting()}`);
  console.log(`  Active meeting: ${manager.getActiveMeeting()?.title}`);

  // Add some topics
  await manager.addTopics(["funding", "growth metrics", "roadmap"]);
  console.log(`  Topics: ${manager.getActiveMeeting()?.topics.join(", ")}`);

  // Wait a bit then end
  await sleep(1000);
  console.log("\n  Ending meeting...");
  const endedMeeting = await manager.endMeeting();

  console.log(`\n  Meeting ended: ${endedMeeting?.title}`);
  console.log(`  Duration: ${manager.getMeetingDuration(endedMeeting!)}ms`);
  console.log(`  Is in meeting: ${manager.isInMeeting()}`);
  console.log(`  Recent meetings: ${manager.getRecentMeetings().length}`);

  // Clean up
  manager.dispose();
  console.log("\n  ✅ MeetingManager test complete");
}

async function testSettingsManager(userId: string) {
  printSection("Testing SettingsManager");

  const mockLogger = {
    info: (msg: string) => console.log(`  [INFO] ${msg}`),
    error: (msg: string) => console.error(`  [ERROR] ${msg}`),
  };

  const mockDisplay = {
    enableTranscript: () => console.log(`  [DISPLAY] Transcript enabled`),
    disableTranscript: () => console.log(`  [DISPLAY] Transcript disabled`),
  };

  const manager = new SettingsManager({
    userId,
    logger: mockLogger,
    display: mockDisplay,
  });

  // Load settings
  await manager.load();

  // Test settings
  console.log("\n  Current settings:");
  const settings = manager.getSettings();
  console.log(`    Autonomy level: ${settings.autonomyLevel}`);
  console.log(`    Show transcript: ${settings.showLiveTranscript}`);

  // Test presets
  console.log("\n  System presets:");
  const presets = manager.getSystemPresets();
  presets.forEach((p) => {
    console.log(`    - ${p.name} (${p.category})`);
  });

  // Find matching preset
  console.log("\n  Finding preset for 'meeting with VCs about funding'...");
  const matched = manager.findMatchingPreset("meeting with VCs about funding");
  console.log(`    Matched: ${matched?.name || "none"}`);

  // Test sensitive topics
  console.log("\n  Sensitive topics:");
  const topics = manager.getSensitiveTopics();
  topics.forEach((t) => {
    console.log(`    - Keywords: ${t.keywords.slice(0, 3).join(", ")}...`);
  });

  // Check for sensitive content
  console.log("\n  Checking for sensitive content...");
  const check1 = manager.checkForSensitiveContent(
    "Let's discuss the salary increase"
  );
  console.log(
    `    "salary increase": ${check1 ? `SENSITIVE (${check1.action})` : "OK"}`
  );

  const check2 = manager.checkForSensitiveContent(
    "Let's talk about the product roadmap"
  );
  console.log(`    "product roadmap": ${check2 ? "SENSITIVE" : "OK"}`);

  // Clean up
  manager.dispose();
  console.log("\n  ✅ SettingsManager test complete");
}

async function testBroadcastManager(userId: string) {
  printSection("Testing BroadcastManager");

  const manager = new BroadcastManager(userId);

  console.log("\n  Broadcasting events (no clients connected)...");

  // These won't actually send anywhere without clients, but tests the API
  manager.sendTranscript("Hello world", true);
  manager.sendMeetingStarted("meeting-123", "Test Meeting", "team_standup", new Date());
  manager.sendStateChange("idle", "in_meeting");
  manager.sendError("Test error message", "TEST_ERROR");

  console.log(`  Client count: ${manager.getClientCount()}`);
  console.log(`  Has clients: ${manager.hasClients()}`);
  console.log(`  Global client count: ${BroadcastManager.getGlobalClientCount()}`);

  // Clean up
  manager.dispose();
  console.log("\n  ✅ BroadcastManager test complete");
}

async function testFullUserSession(userId: string) {
  printSection("Testing Full UserSession");

  const mockAppSession = new MockAppSession();

  console.log("\n  Creating UserSession...");
  const session = await UserSession.getOrCreate(
    userId,
    mockAppSession as any
  );

  console.log(`  Session created for: ${session.userId}`);
  console.log(`  Is initialized: ${session.isInitialized}`);

  // Test transcription flow
  console.log("\n  Simulating transcriptions...");
  session.onTranscription("Hello, welcome to our investor update.", true);
  session.onTranscription("Let me share our latest metrics.", true);
  session.onTranscription("We've grown 40% month over month.", true);

  // Check transcript buffer
  const recentText = session.transcript.getRecentText(10);
  console.log(`\n  Recent transcript: "${recentText}"`);

  // Test meeting start
  console.log("\n  Starting a meeting...");
  await session.meeting.startMeeting({
    title: "Q4 Investor Update",
    category: "investor_update",
    confidence: 0.9,
  });

  console.log(`  In meeting: ${session.meeting.isInMeeting()}`);

  // More transcription during meeting
  session.onTranscription("Our revenue is now $2M ARR.", true);
  session.onTranscription("We're planning to raise Series A.", true);

  // End meeting
  await sleep(500);
  console.log("\n  Ending meeting...");
  await session.meeting.endMeeting();

  console.log(`  In meeting: ${session.meeting.isInMeeting()}`);
  console.log(
    `  Recent meetings: ${session.meeting.getRecentMeetings().length}`
  );

  // Clean up
  await UserSession.remove(userId);
  console.log("\n  ✅ Full UserSession test complete");
}

async function simulateMeeting(userId: string) {
  printHeader("Simulating Full Meeting Flow");

  const mockAppSession = new MockAppSession();
  const session = await UserSession.getOrCreate(userId, mockAppSession as any);

  console.log("🎬 Starting meeting simulation...\n");

  // Pre-meeting chit-chat
  const preMeetingPhrases = [
    "Hey, how's it going?",
    "Good to see you again.",
    "Let me just get my notes ready.",
  ];

  console.log("📝 Pre-meeting conversation:");
  for (const phrase of preMeetingPhrases) {
    session.onTranscription(phrase, true);
    await sleep(300);
  }

  // Meeting starts
  console.log("\n🚀 Meeting starting...");
  await session.meeting.startMeeting({
    title: "Product Roadmap Review",
    category: "team_standup",
    confidence: 0.88,
    attendees: ["Alice", "Bob", "Charlie"],
  });

  // Meeting content
  const meetingPhrases = [
    "Alright, let's get started with our product roadmap review.",
    "First, I want to go over what we shipped last sprint.",
    "We completed the new dashboard feature.",
    "Users are loving it, we've seen a 30% increase in engagement.",
    "For next sprint, we're planning to work on the mobile app.",
    "Bob, can you give us an update on the API integration?",
    "Sure, the API is almost ready. We just need to finish testing.",
    "Great. Charlie, what about the design system?",
    "The design system is on track. We should have it done by Friday.",
    "Perfect. Any blockers anyone wants to discuss?",
    "I'm blocked on the authentication module. Need help from backend.",
    "Okay, let's sync on that after this meeting.",
    "Alright, I think we're good. Let's wrap up.",
  ];

  console.log("\n📝 Meeting in progress:");
  for (const phrase of meetingPhrases) {
    console.log(`   "${phrase}"`);
    session.onTranscription(phrase, true);
    await sleep(200);
  }

  // Add topics discovered during meeting
  await session.meeting.addTopics([
    "dashboard feature",
    "mobile app",
    "API integration",
    "design system",
    "authentication blocker",
  ]);

  // End meeting
  console.log("\n🏁 Meeting ending...");
  await sleep(500);
  const endedMeeting = await session.meeting.endMeeting();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  MEETING SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Title: ${endedMeeting?.title}`);
  console.log(`  Category: ${endedMeeting?.category}`);
  console.log(`  Duration: ${((endedMeeting?.endTime?.getTime() || 0) - (endedMeeting?.startTime?.getTime() || 0)) / 1000}s`);
  console.log(`  Attendees: ${endedMeeting?.attendees.join(", ")}`);
  console.log(`  Topics: ${endedMeeting?.topics.join(", ")}`);
  console.log(`  Transcript range: ${endedMeeting?.transcriptStartIndex} - ${endedMeeting?.transcriptEndIndex}`);

  // Get transcript
  const transcript = session.transcript.getRecentText(100);
  console.log(`\n  Full Transcript:\n  "${transcript}"`);

  // Clean up
  await UserSession.remove(userId);
  console.log("\n✅ Meeting simulation complete!");
}

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const userId = args.find((a) => a.startsWith("--user="))?.split("=")[1] || "test@example.com";
  const simulateMeetingFlag = args.includes("--simulate-meeting");
  const testOnly = args.find((a) => a.startsWith("--test="))?.split("=")[1];

  printHeader(`SEGA Session Test CLI`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Args: ${args.join(" ") || "(none)"}`);

  try {
    if (simulateMeetingFlag) {
      await simulateMeeting(userId);
    } else if (testOnly) {
      switch (testOnly) {
        case "transcript":
          await testTranscriptManager(userId);
          break;
        case "meeting":
          await testMeetingManager(userId);
          break;
        case "settings":
          await testSettingsManager(userId);
          break;
        case "broadcast":
          await testBroadcastManager(userId);
          break;
        case "session":
          await testFullUserSession(userId);
          break;
        default:
          console.error(`Unknown test: ${testOnly}`);
          console.log("Available tests: transcript, meeting, settings, broadcast, session");
      }
    } else {
      // Run all tests
      await testTranscriptManager(userId);
      await testMeetingManager(userId);
      await testSettingsManager(userId);
      await testBroadcastManager(userId);
      await testFullUserSession(userId);
    }

    printHeader("All Tests Complete! ✅");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
