/**
 * Generate Notes Now
 * Takes today's real transcript data and generates actual meeting notes using AI
 *
 * Usage:
 *   bun run src/cli/generate-notes-now.ts
 *   bun run src/cli/generate-notes-now.ts --user=isaiahballah@gmail.com
 *   bun run src/cli/generate-notes-now.ts --skip-email
 *   bun run src/cli/generate-notes-now.ts --title="My Meeting"
 */

import { Resend } from "resend";
import {
  connectDB,
  disconnectDB,
  isDBConnected,
  Meeting as MeetingModel,
  Note as NoteModel,
  ActionItem as ActionItemModel,
  DailyTranscript as DailyTranscriptModel,
} from "../services/db";
import {
  createProviderFromEnv,
  extractText,
  type AgentProvider,
  type UnifiedMessage,
} from "../services/llm";

// Parse command line args
const args = process.argv.slice(2);
const userId =
  args.find((a) => a.startsWith("--user="))?.split("=")[1] ||
  "isaiahballah@gmail.com";
const skipEmail = args.includes("--skip-email");
const customTitle = args.find((a) => a.startsWith("--title="))?.split("=")[1];

console.log("\n========================================");
console.log("📝 Generate Notes from Real Transcripts");
console.log("========================================\n");
console.log(`User: ${userId}`);
console.log(`Skip Email: ${skipEmail}`);
if (customTitle) console.log(`Custom Title: ${customTitle}`);
console.log("");

// Prompts for AI
const CLASSIFICATION_PROMPT = `Analyze this transcript and classify the meeting/conversation.

Transcript:
"""
{{TRANSCRIPT}}
"""

Respond with ONLY a JSON object (no markdown):
{
  "title": "string - descriptive title for the meeting",
  "category": "investor_update | board_meeting | one_on_one | team_standup | client_call | interview | networking | personal | unknown",
  "attendees": ["array of detected names/participants"],
  "topics": ["array of main topics discussed"],
  "confidence": 0.0-1.0
}`;

const NOTES_GENERATION_PROMPT = `Generate comprehensive meeting notes from this transcript.

Meeting: {{TITLE}}
Category: {{CATEGORY}}
Attendees: {{ATTENDEES}}

Transcript:
"""
{{TRANSCRIPT}}
"""

Generate detailed meeting notes. Respond with ONLY a JSON object (no markdown):
{
  "summary": "2-3 sentence executive summary of the meeting",
  "keyPoints": ["array of key points discussed - be specific and detailed"],
  "decisions": ["array of decisions made during the meeting"],
  "actionItems": [
    {
      "description": "what needs to be done - be specific",
      "assignee": "who is responsible (if mentioned, otherwise null)",
      "dueDate": "due date if mentioned (ISO format) or null",
      "priority": "urgent | high | medium | low",
      "sourceText": "the quote from transcript that indicates this action"
    }
  ],
  "content": "Full formatted meeting notes in markdown format with sections"
}

Be thorough and capture all important details. Extract ALL action items mentioned.`;

async function main() {
  let provider: AgentProvider | null = null;

  // Initialize LLM
  console.log("1️⃣  Initializing AI provider...\n");
  try {
    provider = createProviderFromEnv();
    if (!provider) {
      console.error("❌ No LLM provider available. Set GEMINI_API_KEY or ANTHROPIC_API_KEY");
      process.exit(1);
    }
    console.log("✅ AI provider ready\n");
  } catch (error) {
    console.error("❌ Failed to initialize AI:", error);
    process.exit(1);
  }

  // Connect to database
  console.log("2️⃣  Connecting to database...\n");
  try {
    await connectDB();
    if (!isDBConnected()) {
      console.log("⚠️  Database not connected. Set MONGODB_URI.\n");
      process.exit(1);
    }
    console.log("✅ Database connected\n");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }

  // Get today's transcript
  console.log("3️⃣  Fetching today's transcript...\n");
  const today = new Date().toISOString().split("T")[0];

  let transcript: any = null;
  let transcriptText = "";

  try {
    transcript = await DailyTranscriptModel.findOne({ userId, date: today });

    if (!transcript || !transcript.segments || transcript.segments.length === 0) {
      console.log("⚠️  No transcript found for today.");
      console.log("   Make sure you have glasses connected and have been speaking.\n");

      // Try to find any recent transcript
      const recentTranscript = await DailyTranscriptModel.findOne({ userId })
        .sort({ date: -1 });

      if (recentTranscript && recentTranscript.segments?.length > 0) {
        console.log(`   Found transcript from ${recentTranscript.date} with ${recentTranscript.segments.length} segments.`);
        console.log("   Using this transcript instead.\n");
        transcript = recentTranscript;
      } else {
        console.log("   No transcripts found at all. Exiting.\n");
        await disconnectDB();
        process.exit(1);
      }
    }

    // Extract text from segments
    const segments = transcript.segments.filter((s: any) => s.isFinal !== false);
    transcriptText = segments.map((s: any) => {
      const speaker = s.speakerHint ? `[${s.speakerHint}] ` : "";
      return `${speaker}${s.text}`;
    }).join("\n");

    console.log(`✅ Found transcript with ${segments.length} segments`);
    console.log(`   Date: ${transcript.date}`);
    console.log(`   Total characters: ${transcriptText.length}`);
    console.log(`   Preview: "${transcriptText.substring(0, 100)}..."\n`);

  } catch (error) {
    console.error("❌ Failed to fetch transcript:", error);
    await disconnectDB();
    process.exit(1);
  }

  if (transcriptText.length < 50) {
    console.log("⚠️  Transcript too short to generate meaningful notes.\n");
    await disconnectDB();
    process.exit(1);
  }

  // Classify the meeting
  console.log("4️⃣  Analyzing transcript with AI...\n");

  let classification = {
    title: customTitle || "Meeting Notes",
    category: "unknown",
    attendees: [] as string[],
    topics: [] as string[],
    confidence: 0.5,
  };

  try {
    const classificationPrompt = CLASSIFICATION_PROMPT.replace("{{TRANSCRIPT}}", transcriptText.substring(0, 8000));

    const messages: UnifiedMessage[] = [{ role: "user", content: classificationPrompt }];
    const response = await provider.chat(messages, {
      tier: "smart",
      maxTokens: 1024,
      temperature: 0.3,
    });

    const text = extractText(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      classification = {
        title: customTitle || parsed.title || "Meeting Notes",
        category: parsed.category || "unknown",
        attendees: parsed.attendees || [],
        topics: parsed.topics || [],
        confidence: parsed.confidence || 0.5,
      };
    }

    console.log(`✅ Meeting classified:`);
    console.log(`   Title: ${classification.title}`);
    console.log(`   Category: ${classification.category}`);
    console.log(`   Attendees: ${classification.attendees.join(", ") || "Unknown"}`);
    console.log(`   Topics: ${classification.topics.join(", ") || "Various"}\n`);

  } catch (error) {
    console.log("⚠️  Classification failed, using defaults:", error);
  }

  // Generate notes
  console.log("5️⃣  Generating meeting notes...\n");

  let notes: any = null;

  try {
    const notesPrompt = NOTES_GENERATION_PROMPT
      .replace("{{TITLE}}", classification.title)
      .replace("{{CATEGORY}}", classification.category)
      .replace("{{ATTENDEES}}", classification.attendees.join(", ") || "Unknown")
      .replace("{{TRANSCRIPT}}", transcriptText.substring(0, 12000));

    const messages: UnifiedMessage[] = [{ role: "user", content: notesPrompt }];
    const response = await provider.chat(messages, {
      tier: "smart",
      maxTokens: 4096,
      temperature: 0.5,
    });

    const text = extractText(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      notes = JSON.parse(jsonMatch[0]);
    }

    if (!notes) {
      throw new Error("Failed to parse notes response");
    }

    console.log(`✅ Notes generated:`);
    console.log(`   Summary: ${notes.summary?.substring(0, 100)}...`);
    console.log(`   Key Points: ${notes.keyPoints?.length || 0}`);
    console.log(`   Decisions: ${notes.decisions?.length || 0}`);
    console.log(`   Action Items: ${notes.actionItems?.length || 0}\n`);

  } catch (error) {
    console.error("❌ Failed to generate notes:", error);
    await disconnectDB();
    process.exit(1);
  }

  // Save to database
  console.log("6️⃣  Saving to database...\n");

  let savedMeeting: any = null;
  let savedNote: any = null;
  const savedActionItems: any[] = [];

  try {
    // Create meeting
    savedMeeting = await MeetingModel.create({
      userId,
      title: classification.title,
      category: classification.category,
      status: "complete",
      startTime: transcript.segments[0]?.timestamp || new Date(),
      endTime: transcript.segments[transcript.segments.length - 1]?.timestamp || new Date(),
      date: transcript.date,
      attendees: classification.attendees,
      topics: classification.topics,
      transcriptRange: {
        startIndex: 0,
        endIndex: transcript.segments.length - 1,
      },
    });
    console.log(`   ✅ Created meeting: ${savedMeeting._id}`);

    // Create note
    savedNote = await NoteModel.create({
      userId,
      meetingId: savedMeeting._id,
      title: classification.title,
      summary: notes.summary || "",
      keyPoints: notes.keyPoints || [],
      decisions: notes.decisions || [],
      content: notes.content || "",
      detailLevel: "detailed",
      date: transcript.date,
      timeRange: {
        start: transcript.segments[0]?.timestamp || new Date(),
        end: transcript.segments[transcript.segments.length - 1]?.timestamp || new Date(),
      },
    });
    console.log(`   ✅ Created note: ${savedNote._id}`);

    // Create action items
    if (notes.actionItems && notes.actionItems.length > 0) {
      for (const item of notes.actionItems) {
        const actionItem = await ActionItemModel.create({
          userId,
          meetingId: savedMeeting._id,
          noteId: savedNote._id,
          description: item.description,
          assignee: item.assignee || undefined,
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          priority: item.priority || "medium",
          status: "pending",
          sourceText: item.sourceText,
        });
        savedActionItems.push(actionItem);
        console.log(`   ✅ Created action: ${item.description.substring(0, 40)}...`);
      }
    }

    console.log("");

  } catch (error) {
    console.error("❌ Failed to save to database:", error);
  }

  // Send email
  if (!skipEmail) {
    console.log("7️⃣  Sending email summary...\n");

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log("⚠️  No RESEND_API_KEY set - skipping email\n");
    } else {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "SEGA <onboarding@resend.dev>";

        // Format action items for email
        const actionItemsHtml = savedActionItems.length > 0
          ? savedActionItems.map((item) => {
              const priorityColor = {
                urgent: "#ef4444",
                high: "#f59e0b",
                medium: "#3b82f6",
                low: "#6b7280",
              }[item.priority] || "#6b7280";

              return `
                <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid ${priorityColor};">
                  <strong>${item.description}</strong><br>
                  <small style="color: #6b7280;">
                    ${item.assignee ? `Assignee: ${item.assignee} • ` : ""}
                    ${item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleDateString()} • ` : ""}
                    <span style="color: ${priorityColor}; text-transform: uppercase;">${item.priority}</span>
                  </small>
                </div>
              `;
            }).join("")
          : '<p style="color: #6b7280;">No action items detected.</p>';

        // Format key points
        const keyPointsHtml = notes.keyPoints?.length > 0
          ? `<ul>${notes.keyPoints.map((p: string) => `<li>${p}</li>`).join("")}</ul>`
          : '<p style="color: #6b7280;">No key points extracted.</p>';

        // Format decisions
        const decisionsHtml = notes.decisions?.length > 0
          ? `<ul>${notes.decisions.map((d: string) => `<li>${d}</li>`).join("")}</ul>`
          : '<p style="color: #6b7280;">No decisions recorded.</p>';

        const result = await resend.emails.send({
          from: fromEmail,
          to: userId,
          subject: `Meeting Notes: ${classification.title}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #374151; margin-top: 25px; font-size: 18px; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${classification.title}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">
        ${classification.category} • ${classification.attendees.length > 0 ? classification.attendees.join(", ") : "Meeting notes"}
      </p>
    </div>
    <div class="content">
      <h2>📝 Summary</h2>
      <p>${notes.summary || "No summary available."}</p>

      <h2>🎯 Key Points</h2>
      ${keyPointsHtml}

      <h2>✅ Decisions</h2>
      ${decisionsHtml}

      <h2>📌 Action Items</h2>
      ${actionItemsHtml}

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Generated by SEGA • Smart Executive Glasses Assistant<br>
        From ${transcript.segments.length} transcript segments on ${transcript.date}
      </p>
    </div>
  </div>
</body>
</html>
          `,
        });

        console.log(`   ✅ Email sent: ${result.data?.id}\n`);
      } catch (error) {
        console.log("   ❌ Failed to send email:", error);
      }
    }
  } else {
    console.log("⏭️  Skipping email (--skip-email flag)\n");
  }

  // Cleanup
  await disconnectDB();

  console.log("========================================");
  console.log("🎉 Notes generation complete!");
  console.log("========================================\n");
  console.log("Generated:");
  console.log(`  📋 Meeting: ${classification.title}`);
  console.log(`  📝 Summary: ${notes.summary?.substring(0, 60)}...`);
  console.log(`  🎯 ${notes.keyPoints?.length || 0} key points`);
  console.log(`  ✅ ${notes.decisions?.length || 0} decisions`);
  console.log(`  📌 ${savedActionItems.length} action items`);
  if (!skipEmail) {
    console.log(`  📧 Email sent to ${userId}`);
  }
  console.log("\nRefresh the Notes page in the webview to see your notes!");
  console.log("");
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
