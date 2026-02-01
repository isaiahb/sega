/**
 * Demo Seed Script - Executive Lens Hackathon
 * Populates the database with hackathon day data for demo purposes
 *
 * Usage:
 *   bun run src/cli/seed-demo.ts
 *   bun run src/cli/seed-demo.ts --clear (clears all data first)
 *   bun run src/cli/seed-demo.ts --skip-email (skip sending email)
 */

import mongoose from "mongoose";
import { Resend } from "resend";
import {
  connectDB,
  disconnectDB,
  Meeting as MeetingModel,
  Note as NoteModel,
  ActionItem as ActionItemModel,
  DailyTranscript as DailyTranscriptModel,
  ResearchResult as ResearchResultModel,
} from "../services/db";

// Generate ObjectIds for relationships
const meetingIds = {
  kickoff: new mongoose.Types.ObjectId(),
  frontend: new mongoose.Types.ObjectId(),
  demo: new mongoose.Types.ObjectId(),
};

const args = process.argv.slice(2);
const userId = "isaiahballah@gmail.com";
const shouldClear = args.includes("--clear");
const skipEmail = args.includes("--skip-email");

console.log("\n========================================");
console.log("🌱 Executive Lens Hackathon Demo Seed");
console.log("========================================\n");
console.log(`User: ${userId}`);
console.log(`Clear existing data: ${shouldClear}`);
console.log(`Skip email: ${skipEmail}`);
console.log("");

// Get today's date at different times
const today = new Date();
const todayAt = (hour: number, minute: number = 0) => {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// Hackathon day transcript - discussions about building Executive Lens
const TRANSCRIPT_SEGMENTS = [
  // Morning kickoff - 9:00 AM
  {
    time: todayAt(9, 0),
    speaker: "Isaiah",
    text: "Alright team, hackathon day! Let's build something amazing with the Even Realities G1 glasses.",
  },
  {
    time: todayAt(9, 1),
    speaker: "Aryan",
    text: "I'm excited! So we're building an executive assistant that runs on smart glasses?",
  },
  {
    time: todayAt(9, 2),
    speaker: "Isaiah",
    text: "Exactly. We're calling it Executive Lens - or SEGA internally. Smart Executive Glasses Assistant.",
  },
  {
    time: todayAt(9, 3),
    speaker: "Parth",
    text: "I love the concept. Real-time meeting intelligence displayed right in your field of view.",
  },
  {
    time: todayAt(9, 5),
    speaker: "Isaiah",
    text: "The key insight is that executives are in meetings all day. What if we could give them superpowers?",
  },
  {
    time: todayAt(9, 6),
    speaker: "Aryan",
    text: "Like automatic note-taking, action item extraction, and real-time research?",
  },
  {
    time: todayAt(9, 7),
    speaker: "Isaiah",
    text: "Yes! And it all happens automatically. The glasses listen, understand context, and surface relevant info.",
  },
  {
    time: todayAt(9, 10),
    speaker: "Parth",
    text: "For the UI, I'm thinking clean and minimal. The Today view should show the glasses status and live transcript.",
  },
  {
    time: todayAt(9, 12),
    speaker: "Isaiah",
    text: "Perfect. Let's divide and conquer. Parth on design, Aryan on frontend, I'll handle the backend and AI.",
  },

  // Architecture discussion - 10:00 AM
  {
    time: todayAt(10, 0),
    speaker: "Isaiah",
    text: "Let me walk you through the architecture. We have a UserSession that manages all the state for each user.",
  },
  {
    time: todayAt(10, 2),
    speaker: "Aryan",
    text: "So each user gets their own session with managers for transcripts, meetings, notes, and research?",
  },
  {
    time: todayAt(10, 3),
    speaker: "Isaiah",
    text: "Exactly. The AgentManager is the brain - it analyzes transcripts and orchestrates everything.",
  },
  {
    time: todayAt(10, 5),
    speaker: "Parth",
    text: "What about the glasses display? How do we show information to the user?",
  },
  {
    time: todayAt(10, 6),
    speaker: "Isaiah",
    text: "The DisplayManager handles that. It can show messages, notifications, and even a dashboard view.",
  },
  {
    time: todayAt(10, 8),
    speaker: "Aryan",
    text: "And the web UI connects via Server-Sent Events for real-time updates?",
  },
  {
    time: todayAt(10, 9),
    speaker: "Isaiah",
    text: "Right. The BroadcastManager pushes events to all connected clients - transcripts, meeting status, research progress.",
  },
  {
    time: todayAt(10, 15),
    speaker: "Isaiah",
    text: "For the AI, I'm using Gemini for meeting detection and notes generation. It's fast and accurate.",
  },
  {
    time: todayAt(10, 17),
    speaker: "Parth",
    text: "Can users trigger actions with voice commands?",
  },
  {
    time: todayAt(10, 18),
    speaker: "Isaiah",
    text: "Yes! Say 'Hey Sega, send me the meeting notes' and it compiles everything and emails it to you.",
  },

  // Frontend deep dive - 11:30 AM
  {
    time: todayAt(11, 30),
    speaker: "Aryan",
    text: "The TodayView is coming together. I have the G1 status bar showing connection state.",
  },
  {
    time: todayAt(11, 32),
    speaker: "Parth",
    text: "Make sure the glasses image transitions smoothly to the HUD view when recording starts.",
  },
  {
    time: todayAt(11, 34),
    speaker: "Aryan",
    text: "Got it. I'm using Framer Motion for all the animations. The transcript scrolls automatically too.",
  },
  {
    time: todayAt(11, 36),
    speaker: "Isaiah",
    text: "Nice! How's the SSE integration working?",
  },
  {
    time: todayAt(11, 37),
    speaker: "Aryan",
    text: "Great. The useSSE hook handles reconnection and event parsing. All transcript events show up immediately.",
  },
  {
    time: todayAt(11, 40),
    speaker: "Parth",
    text: "For the Notes view, I want a clean folder structure. Notes grouped by date with expandable details.",
  },
  {
    time: todayAt(11, 42),
    speaker: "Aryan",
    text: "And the Actions view should show task status - todo, in progress, done. With filters.",
  },

  // Lunch break discussion - 12:30 PM
  {
    time: todayAt(12, 30),
    speaker: "Isaiah",
    text: "Quick sync over lunch. How are we feeling about the demo?",
  },
  {
    time: todayAt(12, 32),
    speaker: "Parth",
    text: "Design is solid. The horizontal G1 status bar looks much better than the vertical layout.",
  },
  {
    time: todayAt(12, 34),
    speaker: "Aryan",
    text: "Frontend is almost there. Just need to wire up the demo command flow.",
  },
  {
    time: todayAt(12, 36),
    speaker: "Isaiah",
    text: "I'll add a special command - when you say 'send me the meeting notes', it triggers a demo sequence.",
  },
  {
    time: todayAt(12, 38),
    speaker: "Aryan",
    text: "That would be perfect for the presentation. Show the whole flow from voice command to email.",
  },

  // Afternoon coding - 2:00 PM
  {
    time: todayAt(14, 0),
    speaker: "Isaiah",
    text: "The demo flow is working. It shows progress on both the glasses and the web UI.",
  },
  {
    time: todayAt(14, 2),
    speaker: "Parth",
    text: "Can you walk us through what happens when you trigger it?",
  },
  {
    time: todayAt(14, 4),
    speaker: "Isaiah",
    text: "Sure. First it acknowledges the command on the glasses. Then it shows 'Analyzing transcript'...",
  },
  {
    time: todayAt(14, 5),
    speaker: "Isaiah",
    text: "Then 'Found 12 key topics, extracting action items'. Each step broadcasts to the web UI too.",
  },
  {
    time: todayAt(14, 7),
    speaker: "Aryan",
    text: "And the transcript view shows system messages for each step?",
  },
  {
    time: todayAt(14, 8),
    speaker: "Isaiah",
    text: "Exactly. Green highlighted messages like '🔍 Starting research' and '✅ Complete'.",
  },
  {
    time: todayAt(14, 12),
    speaker: "Parth",
    text: "Love it. The visual feedback makes it feel alive and intelligent.",
  },

  // Testing and polish - 4:00 PM
  {
    time: todayAt(16, 0),
    speaker: "Aryan",
    text: "Found a bug - the interim text wasn't clearing after final transcript. Fixed it.",
  },
  {
    time: todayAt(16, 5),
    speaker: "Isaiah",
    text: "Good catch. I also improved the voice command detection. Now it handles variations better.",
  },
  {
    time: todayAt(16, 8),
    speaker: "Parth",
    text: "The loading states look good. Skeleton loaders while fetching data.",
  },
  {
    time: todayAt(16, 12),
    speaker: "Isaiah",
    text: "Let's do a full run-through. Aryan, can you trigger the demo command?",
  },
  {
    time: todayAt(16, 14),
    speaker: "Aryan",
    text: "Hey Sega, send me the meeting notes.",
  },
  {
    time: todayAt(16, 15),
    speaker: "Isaiah",
    text: "Perfect! Watch the glasses... 'Got it, gathering meeting notes'... now analyzing...",
  },
  {
    time: todayAt(16, 17),
    speaker: "Parth",
    text: "The web UI is updating in real-time. This is really impressive.",
  },

  // Final prep - 5:30 PM
  {
    time: todayAt(17, 30),
    speaker: "Isaiah",
    text: "Alright, we're in good shape. Let's prep for the final demo.",
  },
  {
    time: todayAt(17, 32),
    speaker: "Aryan",
    text: "I'll make sure the seed data is loaded so we have realistic transcripts to show.",
  },
  {
    time: todayAt(17, 34),
    speaker: "Parth",
    text: "And I'll double-check the responsive design. It should look good on the projector.",
  },
  {
    time: todayAt(17, 36),
    speaker: "Isaiah",
    text: "Great teamwork today. Executive Lens is going to blow them away.",
  },
  {
    time: todayAt(17, 38),
    speaker: "Aryan",
    text: "From idea to working demo in one day. That's what hackathons are all about!",
  },
  {
    time: todayAt(17, 40),
    speaker: "Parth",
    text: "The MentraOS integration is seamless. This could be a real product.",
  },
];

// Meetings for the day
const dateStr = today.toISOString().split("T")[0];

const MEETINGS = [
  {
    _id: meetingIds.kickoff,
    userId,
    date: dateStr,
    title: "Executive Lens Hackathon Kickoff",
    category: "team_standup",
    startTime: todayAt(9, 0),
    endTime: todayAt(10, 30),
    attendees: ["Isaiah", "Aryan", "Parth"],
    topics: ["Product Vision", "Architecture", "Task Assignment"],
    status: "complete" as const,
    transcriptRange: { startIndex: 0, endIndex: 17 },
    classification: {
      category: "team_standup",
      title: "Executive Lens Hackathon Kickoff",
      confidence: 0.95,
      attendees: ["Isaiah", "Aryan", "Parth"],
    },
  },
  {
    _id: meetingIds.frontend,
    userId,
    date: dateStr,
    title: "Frontend Architecture Sync",
    category: "team_standup",
    startTime: todayAt(11, 30),
    endTime: todayAt(12, 15),
    attendees: ["Isaiah", "Aryan", "Parth"],
    topics: ["React Components", "SSE Integration", "Animations"],
    status: "complete" as const,
    transcriptRange: { startIndex: 18, endIndex: 28 },
    classification: {
      category: "team_standup",
      title: "Frontend Architecture Sync",
      confidence: 0.92,
      attendees: ["Isaiah", "Aryan", "Parth"],
    },
  },
  {
    _id: meetingIds.demo,
    userId,
    date: dateStr,
    title: "Demo Preparation & Testing",
    category: "team_standup",
    startTime: todayAt(16, 0),
    endTime: todayAt(17, 45),
    attendees: ["Isaiah", "Aryan", "Parth"],
    topics: ["Bug Fixes", "Demo Flow", "Final Polish"],
    status: "complete" as const,
    transcriptRange: { startIndex: 29, endIndex: 50 },
    classification: {
      category: "team_standup",
      title: "Demo Preparation & Testing",
      confidence: 0.94,
      attendees: ["Isaiah", "Aryan", "Parth"],
    },
  },
];

// Notes for the day
const NOTES = [
  {
    meetingId: meetingIds.kickoff,
    userId,
    title: "Executive Lens Hackathon Kickoff",
    summary:
      "Kicked off the hackathon with a clear vision for Executive Lens - an AI-powered assistant for smart glasses that helps executives during meetings with real-time transcription, intelligent note-taking, and contextual research.",
    keyPoints: [
      "Product name: Executive Lens (internal codename: SEGA)",
      "Target user: Busy executives who are in meetings all day",
      "Key features: Live transcription, automatic notes, action item extraction, voice commands",
      "Architecture: UserSession pattern with specialized managers for each capability",
      "AI: Using Gemini for meeting detection and notes generation",
    ],
    decisions: [
      "Isaiah handles backend and AI integration",
      "Aryan builds the frontend with React and Framer Motion",
      "Parth designs the UI/UX with focus on clean, minimal interface",
    ],
    detailLevel: "detailed",
    content: `# Executive Lens Hackathon Kickoff

## Vision
Building an AI-powered executive assistant that runs on Even Realities G1 smart glasses. The glasses listen to meetings, understand context, and provide real-time intelligence.

## Architecture Overview
- **UserSession**: Central state management per user
- **AgentManager**: The "brain" that analyzes transcripts and orchestrates actions
- **TranscriptManager**: Handles real-time transcription buffering
- **MeetingManager**: Detects meeting start/end, classifies meeting types
- **NotesManager**: Generates meeting notes with AI
- **ResearchManager**: Performs deep research on mentioned entities
- **DisplayManager**: Controls what shows on the glasses
- **BroadcastManager**: SSE events to web UI

## Tech Stack
- Backend: Bun + Hono
- Frontend: React + Tailwind + Framer Motion
- AI: Google Gemini
- Real-time: Server-Sent Events
- Database: MongoDB`,
    createdAt: todayAt(10, 30),
    updatedAt: todayAt(10, 30),
  },
  {
    meetingId: meetingIds.frontend,
    userId,
    title: "Frontend Architecture Sync",
    summary:
      "Deep dive into the frontend implementation. Decided on horizontal G1 status bar layout, SSE integration via useSSE hook, and Framer Motion for smooth animations.",
    keyPoints: [
      "TodayView is the main dashboard showing glasses status and live transcript",
      "G1 status bar: horizontal layout at top, shows connection state and HUD preview",
      "useSSE hook handles real-time event streaming with automatic reconnection",
      "Transcript auto-scrolls and shows interim text with typing indicator",
      "System messages highlighted in green for research/command progress",
    ],
    decisions: [
      "Use horizontal layout for G1 status (not vertical)",
      "Transcript takes full width below status bar",
      "Framer Motion AnimatePresence for smooth state transitions",
    ],
    detailLevel: "detailed",
    content: `# Frontend Architecture Sync

## Component Structure
- **TodayView**: Main dashboard
  - G1StatusBar: Connection status, HUD preview
  - LiveTranscript: Real-time transcription display

- **NotesView**: Meeting notes browser
  - Grouped by date
  - Expandable note details

- **ActionsView**: Task management
  - Filter by status (todo, in progress, done)
  - Quick status updates

## Real-time Integration
The useSSE hook connects to /api/sse and handles:
- Automatic reconnection on disconnect
- Event type parsing
- Event history for debugging

## Animation Strategy
Using Framer Motion for:
- Page transitions
- Transcript item entrance
- Status bar state changes
- Loading states`,
    createdAt: todayAt(12, 15),
    updatedAt: todayAt(12, 15),
  },
  {
    meetingId: meetingIds.demo,
    userId,
    title: "Demo Preparation & Testing",
    summary:
      "Final testing and polish before the demo. Added 'send me the meeting notes' voice command that triggers a full demo flow showing progress on glasses and web UI simultaneously.",
    keyPoints: [
      "Demo command: 'Hey Sega, send me the meeting notes'",
      "Flow shows step-by-step progress on glasses HUD",
      "Web UI receives real-time updates via SSE",
      "System messages appear in transcript: 🔍 Starting, 📊 Progress, ✅ Complete",
      "Full flow takes about 15 seconds - perfect for demo",
    ],
    decisions: [
      "Keep demo flow to ~15 seconds for presentation",
      "Show both glasses and web UI side by side during demo",
      "Pre-load realistic transcript data for demo",
    ],
    detailLevel: "detailed",
    content: `# Demo Preparation & Testing

## Demo Flow
1. User says: "Hey Sega, send me the meeting notes"
2. Glasses show: "📋 Got it! Gathering meeting notes..."
3. Web UI shows: "🔍 Starting: Meeting notes compilation"
4. Glasses show: "🔍 Analyzing transcript..."
5. Web UI shows: "📊 Analyzing meeting transcript..."
6. Glasses show: "📊 Found 12 key topics..."
7. Glasses show: "✍️ Generating summary..."
8. Glasses show: "📧 Preparing email..."
9. Glasses show: "✅ Notes ready! Sending to email..."
10. Web UI shows: "✅ Complete: Meeting notes compiled"

## Bug Fixes
- Fixed interim text not clearing after final transcript
- Improved voice command detection variations
- Added auto-scroll to transcript

## Final Checklist
- [x] Seed data loaded
- [x] SSE connection stable
- [x] Animations smooth
- [x] Responsive on projector`,
    createdAt: todayAt(17, 45),
    updatedAt: todayAt(17, 45),
  },
];

// Action items
const ACTION_ITEMS = [
  {
    meetingId: meetingIds.kickoff.toString(),
    userId,
    description: "Set up UserSession architecture with all managers",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Isaiah",
    dueDate: todayAt(12, 0),
    createdAt: todayAt(9, 30),
  },
  {
    meetingId: meetingIds.kickoff.toString(),
    userId,
    description: "Build TodayView with G1 status and transcript",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Aryan",
    dueDate: todayAt(14, 0),
    createdAt: todayAt(9, 30),
  },
  {
    meetingId: meetingIds.kickoff.toString(),
    userId,
    description: "Design clean horizontal status bar layout",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Parth",
    dueDate: todayAt(11, 0),
    createdAt: todayAt(9, 30),
  },
  {
    meetingId: meetingIds.frontend.toString(),
    userId,
    description: "Implement useSSE hook with reconnection",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Aryan",
    dueDate: todayAt(15, 0),
    createdAt: todayAt(11, 45),
  },
  {
    meetingId: meetingIds.frontend.toString(),
    userId,
    description: "Add Framer Motion animations",
    priority: "medium" as const,
    status: "completed" as const,
    assignee: "Aryan",
    dueDate: todayAt(16, 0),
    createdAt: todayAt(11, 45),
  },
  {
    meetingId: meetingIds.demo.toString(),
    userId,
    description: "Create demo voice command flow",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Isaiah",
    dueDate: todayAt(17, 0),
    createdAt: todayAt(16, 15),
  },
  {
    meetingId: meetingIds.demo.toString(),
    userId,
    description: "Load seed data for demo",
    priority: "high" as const,
    status: "completed" as const,
    assignee: "Aryan",
    dueDate: todayAt(18, 0),
    createdAt: todayAt(17, 35),
  },
  {
    meetingId: meetingIds.demo.toString(),
    userId,
    description: "Test responsive design on projector",
    priority: "medium" as const,
    status: "completed" as const,
    assignee: "Parth",
    dueDate: todayAt(18, 0),
    createdAt: todayAt(17, 35),
  },
];

async function seed() {
  try {
    // Connect to database
    console.log("📦 Connecting to database...");
    await connectDB();
    console.log("✅ Connected!\n");

    // Clear existing data for this user if requested
    if (shouldClear) {
      console.log("🗑️  Clearing existing data for user...");
      await Promise.all([
        MeetingModel.deleteMany({ userId }),
        NoteModel.deleteMany({ userId }),
        ActionItemModel.deleteMany({ userId }),
        DailyTranscriptModel.deleteMany({ userId }),
        ResearchResultModel.deleteMany({ userId }),
      ]);
      console.log("✅ Cleared!\n");
    }

    // Create transcript for today
    console.log("📝 Creating transcript segments...");
    const dateStr = today.toISOString().split("T")[0];

    // Delete existing transcript for today
    await DailyTranscriptModel.deleteOne({ userId, date: dateStr });

    // Create new transcript
    const transcriptDoc = new DailyTranscriptModel({
      userId,
      date: dateStr,
      segments: TRANSCRIPT_SEGMENTS.map((seg, idx) => ({
        index: idx,
        text: seg.text,
        timestamp: seg.time,
        speakerHint: seg.speaker,
        isFinal: true,
      })),
      updatedAt: new Date(),
    });
    await transcriptDoc.save();
    console.log(
      `✅ Created ${TRANSCRIPT_SEGMENTS.length} transcript segments\n`,
    );

    // Create meetings
    console.log("📅 Creating meetings...");
    for (const meeting of MEETINGS) {
      await MeetingModel.create(meeting);
    }
    console.log(`✅ Created ${MEETINGS.length} meetings\n`);

    // Create notes
    console.log("📋 Creating notes...");
    for (const note of NOTES) {
      await NoteModel.create(note);
    }
    console.log(`✅ Created ${NOTES.length} notes\n`);

    // Create action items
    console.log("✅ Creating action items...");
    for (const action of ACTION_ITEMS) {
      await ActionItemModel.create(action);
    }
    console.log(`✅ Created ${ACTION_ITEMS.length} action items\n`);

    // Send email with meeting summary
    if (!skipEmail) {
      console.log("📧 Sending meeting summary email...");
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromEmail =
          process.env.RESEND_FROM_EMAIL || "SEGA <onboarding@resend.dev>";

        try {
          const result = await resend.emails.send({
            from: fromEmail,
            to: userId,
            subject: "📋 Executive Lens Hackathon - Meeting Notes",
            html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .meeting-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #374151; margin-top: 20px; font-size: 18px; }
    h3 { margin: 0 0 8px 0; color: #1a1a1a; }
    .meta { color: #6b7280; font-size: 14px; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 6px 0; }
    .action { background: #d1fae5; padding: 8px 12px; border-radius: 6px; margin: 6px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Executive Lens Hackathon</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Meeting Notes - ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="content">
      <p>Hey Isaiah! Here's a summary of today's hackathon building <strong>Executive Lens</strong> with Aryan and Parth.</p>

      <div class="meeting-card">
        <h3>🎯 Hackathon Kickoff (9:00 AM)</h3>
        <p class="meta">Team: Isaiah, Aryan, Parth</p>
        <h4>Key Decisions:</h4>
        <ul>
          <li>Product name: Executive Lens (codename SEGA)</li>
          <li>Isaiah: Backend + AI integration</li>
          <li>Aryan: Frontend with React + Framer Motion</li>
          <li>Parth: UI/UX design</li>
        </ul>
      </div>

      <div class="meeting-card">
        <h3>💻 Frontend Architecture Sync (11:30 AM)</h3>
        <p class="meta">Deep dive into React components and SSE integration</p>
        <ul>
          <li>TodayView: Main dashboard with G1 status</li>
          <li>useSSE hook for real-time updates</li>
          <li>Framer Motion for smooth animations</li>
        </ul>
      </div>

      <div class="meeting-card">
        <h3>🧪 Demo Prep & Testing (4:00 PM)</h3>
        <p class="meta">Final polish before presentation</p>
        <ul>
          <li>Added "send me meeting notes" voice command</li>
          <li>Fixed transcript streaming bugs</li>
          <li>Tested responsive design</li>
        </ul>
      </div>

      <h2>✅ Completed Action Items</h2>
      <div class="action">✓ Set up UserSession architecture</div>
      <div class="action">✓ Build TodayView with G1 status</div>
      <div class="action">✓ Design horizontal status bar</div>
      <div class="action">✓ Implement useSSE hook</div>
      <div class="action">✓ Add Framer Motion animations</div>
      <div class="action">✓ Create demo voice command flow</div>
      <div class="action">✓ Load seed data for demo</div>
      <div class="action">✓ Test responsive design</div>

      <p class="footer">
        Generated by SEGA • Smart Executive Glasses Assistant<br>
        Built during the Executive Lens Hackathon 🎉
      </p>
    </div>
  </div>
</body>
</html>
            `,
          });
          console.log(`✅ Email sent! ID: ${result.data?.id}\n`);
        } catch (emailError) {
          console.log(`⚠️  Failed to send email: ${emailError}\n`);
        }
      } else {
        console.log("⚠️  No RESEND_API_KEY set - skipping email\n");
      }
    }

    console.log("========================================");
    console.log("🎉 Demo data seeded successfully!");
    console.log("========================================\n");
    console.log("Summary:");
    console.log(`  - ${TRANSCRIPT_SEGMENTS.length} transcript segments`);
    console.log(`  - ${MEETINGS.length} meetings`);
    console.log(`  - ${NOTES.length} notes`);
    console.log(`  - ${ACTION_ITEMS.length} action items`);
    console.log("\nReady for demo! 🚀\n");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seed();
