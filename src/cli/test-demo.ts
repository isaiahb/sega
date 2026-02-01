/**
 * Demo Test Script
 * Tests the full e2e demo flow: transcript → meeting detection → notes → email
 *
 * Usage:
 *   bun run src/cli/test-demo.ts
 *   bun run src/cli/test-demo.ts --user=isaiahballah@gmail.com
 *   bun run src/cli/test-demo.ts --skip-email
 */

import { UserSession } from "../app/session/UserSession";
import { createProviderFromEnv } from "../services/llm";

// Parse command line args
const args = process.argv.slice(2);
const userId =
  args.find((a) => a.startsWith("--user="))?.split("=")[1] ||
  "isaiahballah@gmail.com";
const skipEmail = args.includes("--skip-email");

console.log("\n========================================");
console.log("🎬 SEGA Demo Test Script");
console.log("========================================\n");
console.log(`User: ${userId}`);
console.log(`Skip Email: ${skipEmail}`);
console.log("");

// Mock AppSession for testing without real glasses
const mockAppSession = {
  userId,
  showTextWall: (text: string) => {
    console.log(`[GLASSES] ${text}`);
  },
  showNotification: (text: string) => {
    console.log(`[GLASSES NOTIFICATION] ${text}`);
  },
  showDashboard: (text: string) => {
    console.log(`[GLASSES DASHBOARD] ${text}`);
  },
  clearDisplay: () => {
    console.log(`[GLASSES] (cleared)`);
  },
  on: () => {},
  off: () => {},
};

// Sample meeting transcript for testing
const SAMPLE_TRANSCRIPT = [
  "Hi everyone, thanks for joining today's call.",
  "I'm excited to discuss our Q1 progress with the investors.",
  "So as you know, we've been working on the SEGA project.",
  "Our revenue grew 40% quarter over quarter.",
  "We're now at 2 million in ARR.",
  "John, can you walk us through the product roadmap?",
  "Sure, we're planning to launch the enterprise version in March.",
  "We've also secured a partnership with Acme Corp.",
  "Sarah mentioned we need to finalize the board deck by Friday.",
  "Action item: John to send the updated financials by tomorrow.",
  "Also, we should schedule a follow-up with the lead investor.",
  "Great meeting everyone, let's wrap up here.",
  "Thanks for your time, talk soon.",
];

async function runDemo() {
  console.log("1️⃣  Creating UserSession...\n");

  // Create session using the static method (handles initialization)
  const session = await UserSession.getOrCreate(userId, mockAppSession as any);

  console.log("2️⃣  Session initialized!\n");

  // Check LLM provider
  const provider = createProviderFromEnv();
  if (!provider) {
    console.error(
      "❌ No LLM provider available. Set GEMINI_API_KEY or ANTHROPIC_API_KEY",
    );
    process.exit(1);
  }
  console.log("✅ LLM provider ready\n");

  // Check email
  if (!skipEmail) {
    const emailAvailable = session.email.isAvailable();
    console.log(`📧 Email available: ${emailAvailable}`);
    if (!emailAvailable) {
      console.log("   (Set RESEND_API_KEY to enable email)\n");
    } else {
      console.log(`   Will send to: ${userId}\n`);
    }
  }

  console.log("3️⃣  Simulating meeting transcript...\n");
  console.log("─".repeat(50));

  // Feed transcript segments
  for (let i = 0; i < SAMPLE_TRANSCRIPT.length; i++) {
    const text = SAMPLE_TRANSCRIPT[i];
    const isFinal = true;

    console.log(`[${i + 1}/${SAMPLE_TRANSCRIPT.length}] "${text}"`);

    // Simulate transcript segment
    session.onTranscription({
      text,
      isFinal,
      timestamp: Date.now(),
      speakerHint:
        i % 3 === 0 ? "Speaker A" : i % 3 === 1 ? "Speaker B" : undefined,
    });

    // Small delay between segments
    await sleep(500);

    // Run analysis every few segments (simulating the 5-second loop)
    if ((i + 1) % 4 === 0 || i === SAMPLE_TRANSCRIPT.length - 1) {
      console.log("\n   [Running analysis...]\n");
      // The agent runs on a timer, but we can trigger manually for testing
      // @ts-ignore - accessing private method for testing
      if (session.agent.runAnalysisIfNeeded) {
        // @ts-ignore
        await session.agent.runAnalysisIfNeeded();
      }
      await sleep(1000);
    }
  }

  console.log("─".repeat(50));

  // Check if meeting was detected
  const meeting = session.meeting.getActiveMeeting();
  if (meeting) {
    console.log(`\n✅ Meeting detected: "${meeting.title}"`);
    console.log(`   Category: ${meeting.category}`);
    console.log(`   Started: ${meeting.startTime.toLocaleTimeString()}`);

    console.log("\n4️⃣  Ending meeting and generating notes...\n");

    // End the meeting
    const endedMeeting = await session.meeting.endMeeting();

    if (endedMeeting) {
      console.log(`✅ Meeting ended`);
      console.log(
        `   Duration: ${formatDuration(endedMeeting.endTime!.getTime() - endedMeeting.startTime.getTime())}`,
      );

      // Generate notes
      console.log("\n5️⃣  Generating notes with AI...\n");

      const note = await session.notes.generateNotes(endedMeeting._id!);

      if (note) {
        console.log(`✅ Notes generated!`);
        console.log(`   Title: ${note.title}`);
        console.log(`   Summary: ${note.summary}`);
        console.log(`   Key Points: ${note.keyPoints?.length || 0}`);
        console.log(`   Decisions: ${note.decisions?.length || 0}`);

        // Get action items
        const actionItems = await session.notes.getActionItemsForMeeting(
          endedMeeting._id!,
        );
        console.log(`   Action Items: ${actionItems.length}`);

        if (actionItems.length > 0) {
          console.log("\n   Action Items:");
          actionItems.forEach((item, i) => {
            console.log(`   ${i + 1}. [${item.priority}] ${item.description}`);
            if (item.assignee) console.log(`      Assignee: ${item.assignee}`);
            if (item.dueDate)
              console.log(
                `      Due: ${new Date(item.dueDate).toLocaleDateString()}`,
              );
          });
        }

        // Email is sent automatically by NotesManager.generateNotes()
        // But we can verify it was attempted
        if (!skipEmail && session.email.isAvailable()) {
          console.log(`\n📧 Email summary should have been sent to: ${userId}`);
        }
      } else {
        console.log("❌ Note generation failed");
      }
    }
  } else {
    console.log("\n⚠️  No meeting was detected from the transcript");
    console.log("   The AI may need more context or clearer meeting signals");

    // Try to manually start and end a meeting for testing
    console.log("\n   Trying manual meeting flow...");

    await session.meeting.startMeeting({
      title: "Test Investor Update",
      category: "investor_update",
      confidence: 0.9,
      attendees: ["John", "Sarah"],
    });

    const manualMeeting = session.meeting.getActiveMeeting();
    if (manualMeeting) {
      console.log(`   ✅ Manual meeting started: ${manualMeeting.title}`);

      await sleep(1000);

      const ended = await session.meeting.endMeeting();
      if (ended) {
        console.log(`   ✅ Meeting ended`);

        const note = await session.notes.generateNotes(ended._id!);
        if (note) {
          console.log(`   ✅ Notes generated: ${note.title}`);
        }
      }
    }
  }

  console.log("\n6️⃣  Testing research (optional)...\n");

  // Test research if Firecrawl is available
  if (session.research.isAvailable()) {
    console.log("🔍 Starting research on 'Acme Corp'...");

    try {
      const researchId = await session.research.startResearch(
        "Acme Corp company information",
        "company",
      );
      console.log(`   Research started: ${researchId}`);

      // Wait for research to complete
      let attempts = 0;
      while (attempts < 10) {
        await sleep(2000);
        const result = session.research.getResult(researchId);
        if (result && result.status === "complete") {
          console.log(`   ✅ Research complete!`);
          console.log(`   Summary: ${result.summary?.substring(0, 100)}...`);
          break;
        }
        attempts++;
        console.log(`   Waiting for research... (${attempts}/10)`);
      }
    } catch (err) {
      console.log(`   ⚠️ Research failed: ${err}`);
    }
  } else {
    console.log("⚠️  Firecrawl not available (set FIRECRAWL_API_KEY)");
  }

  // Cleanup
  console.log("\n7️⃣  Cleaning up...\n");
  session.dispose();

  console.log("========================================");
  console.log("✅ Demo test complete!");
  console.log("========================================\n");

  // Summary
  console.log("Check the following:");
  console.log(`  1. Glasses display messages above`);
  console.log(`  2. Notes generated (if meeting detected)`);
  if (!skipEmail) {
    console.log(`  3. Email inbox at ${userId}`);
  }
  console.log("");
}

// Helpers
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Run the demo
runDemo().catch((err) => {
  console.error("❌ Demo failed:", err);
  process.exit(1);
});
