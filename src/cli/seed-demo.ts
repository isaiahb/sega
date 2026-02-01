/**
 * Demo Seed Script
 * Populates the database with sample data and sends test emails for demo purposes
 *
 * Usage:
 *   bun run src/cli/seed-demo.ts
 *   bun run src/cli/seed-demo.ts --user=isaiahballah@gmail.com
 *   bun run src/cli/seed-demo.ts --skip-email
 *   bun run src/cli/seed-demo.ts --skip-db
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

// Parse command line args
const args = process.argv.slice(2);
const userId =
  args.find((a) => a.startsWith("--user="))?.split("=")[1] ||
  "isaiahballah@gmail.com";
const skipEmail = args.includes("--skip-email");
const skipDB = args.includes("--skip-db");

console.log("\n========================================");
console.log("🌱 SEGA Demo Seed Script");
console.log("========================================\n");
console.log(`User: ${userId}`);
console.log(`Skip Email: ${skipEmail}`);
console.log(`Skip DB: ${skipDB}`);
console.log("");

// Sample demo data
const DEMO_MEETINGS = [
  {
    title: "Q1 Investor Update",
    category: "investor_update",
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
    attendees: ["Sarah Chen (Sequoia)", "Michael Park (a16z)", "You"],
    topics: ["Revenue Growth", "Product Roadmap", "Hiring Plans", "Series B"],
    status: "complete",
  },
  {
    title: "Product Roadmap Planning",
    category: "team_standup",
    startTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    endTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    attendees: ["John (Engineering)", "Lisa (Design)", "You"],
    topics: ["Q2 Features", "Technical Debt", "Design System"],
    status: "complete",
  },
  {
    title: "Client Demo - Acme Corp",
    category: "client_call",
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    endTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
    attendees: ["Bob Smith (Acme Corp)", "Jane Doe (Acme Corp)", "You"],
    topics: ["Product Demo", "Pricing", "Integration"],
    status: "complete",
  },
];

const DEMO_NOTES = [
  {
    title: "Q1 Investor Update",
    summary:
      "Productive investor update covering Q1 results. Revenue grew 45% QoQ to $2.3M ARR. Discussed Series B timeline and hiring plans for engineering team expansion.",
    keyPoints: [
      "Revenue hit $2.3M ARR, up 45% from last quarter",
      "User retention at 94%, above industry average",
      "Planning to double engineering team by Q3",
      "Series B discussions to begin in April",
    ],
    decisions: [
      "Proceed with Series B fundraising in April",
      "Hire 5 senior engineers before end of Q2",
      "Expand to European market in H2",
    ],
    content: `# Q1 Investor Update - Meeting Notes

## Key Metrics
- **ARR**: $2.3M (↑45% QoQ)
- **User Retention**: 94%
- **MRR Growth**: 12% month-over-month

## Discussion Points

### Revenue & Growth
Sarah was impressed with our growth trajectory. She mentioned this puts us in the top quartile of their portfolio companies at this stage.

### Product Roadmap
Michael asked about our AI features. We demoed SEGA and he was very interested in the meeting intelligence capabilities.

### Hiring Plans
Both investors support aggressive hiring. They recommended focusing on senior engineers who can mentor the team.

### Series B
Consensus to start Series B process in April. Target raise: $15-20M at $80-100M valuation.

## Next Steps
1. Send updated financial model by Friday
2. Schedule follow-up for Series B kick-off
3. Share product roadmap document`,
  },
  {
    title: "Product Roadmap Planning",
    summary:
      "Team sync on Q2 roadmap priorities. Agreed to focus on enterprise features and API improvements. Design system overhaul planned for late Q2.",
    keyPoints: [
      "Q2 focus: Enterprise features and API v2",
      "Design system overhaul scheduled for May",
      "Technical debt sprint planned for April",
      "New dashboard wireframes ready for review",
    ],
    decisions: [
      "Prioritize SSO and audit logs for enterprise",
      "Allocate 2 weeks for technical debt in April",
      "Launch design system v2 by end of May",
    ],
    content: `# Product Roadmap Planning - Meeting Notes

## Q2 Priorities

### Enterprise Features (High Priority)
- SSO integration (SAML, OIDC)
- Audit logs and compliance
- Role-based access control
- Custom branding

### API Improvements
- API v2 with GraphQL support
- Webhook improvements
- Better rate limiting
- SDK updates for Python and Go

### Design System
- Component library refresh
- Dark mode improvements
- Accessibility audit
- Mobile responsive updates

## Timeline
- April: Technical debt sprint + SSO
- May: API v2 + Design system
- June: Enterprise launch

## Action Items
- [ ] John to scope SSO implementation
- [ ] Lisa to finalize design system specs
- [ ] Schedule enterprise beta with 3 customers`,
  },
  {
    title: "Client Demo - Acme Corp",
    summary:
      "Successful product demo with Acme Corp. They're interested in enterprise plan for 500 users. Follow-up scheduled to discuss pricing and integration requirements.",
    keyPoints: [
      "Acme Corp has 500 potential users",
      "Main interest: meeting intelligence and CRM integration",
      "Current solution: manual note-taking, very inefficient",
      "Budget approved for Q2 software purchases",
    ],
    decisions: [
      "Send custom proposal by end of week",
      "Arrange technical deep-dive with their IT team",
      "Offer 30-day pilot program",
    ],
    content: `# Client Demo - Acme Corp - Meeting Notes

## Attendees
- Bob Smith (VP of Sales, Acme Corp)
- Jane Doe (IT Director, Acme Corp)
- Us

## Demo Highlights

### What Resonated
- Real-time transcription accuracy impressed them
- Action item extraction saves hours per week
- CRM integration is a must-have for their sales team

### Concerns Raised
- Data security and compliance (SOC 2)
- Integration with their existing Salesforce setup
- Onboarding time for 500 users

## Next Steps
1. Send SOC 2 compliance documentation
2. Prepare Salesforce integration demo
3. Create custom pricing proposal for 500 seats
4. Schedule technical deep-dive for next Tuesday

## Opportunity Details
- **Deal Size**: ~$150K ARR
- **Timeline**: Q2 decision
- **Champion**: Bob Smith
- **Decision Maker**: Jane Doe (budget holder)`,
  },
];

const DEMO_ACTION_ITEMS = [
  {
    description: "Send updated financial model to investors",
    assignee: "You",
    priority: "urgent",
    status: "pending",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  },
  {
    description: "Schedule Series B kick-off meeting",
    assignee: "You",
    priority: "high",
    status: "pending",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  },
  {
    description: "Scope SSO implementation",
    assignee: "John",
    priority: "high",
    status: "in_progress",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    description: "Finalize design system specs",
    assignee: "Lisa",
    priority: "medium",
    status: "pending",
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  },
  {
    description: "Send custom proposal to Acme Corp",
    assignee: "You",
    priority: "high",
    status: "pending",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    description: "Prepare Salesforce integration demo",
    assignee: "Engineering",
    priority: "medium",
    status: "pending",
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  },
];

const DEMO_TRANSCRIPT_SEGMENTS = [
  { text: "Good morning everyone, thanks for joining.", speakerHint: "You" },
  {
    text: "Let's start with a quick update on our Q1 numbers.",
    speakerHint: "You",
  },
  {
    text: "Revenue is looking really strong this quarter.",
    speakerHint: "You",
  },
  {
    text: "We hit 2.3 million in ARR, which is a 45% increase from last quarter.",
    speakerHint: "You",
  },
  {
    text: "That's impressive growth. How's the retention looking?",
    speakerHint: "Sarah",
  },
  {
    text: "Retention is at 94%, which is above industry average.",
    speakerHint: "You",
  },
  {
    text: "Great. What about the product roadmap for Q2?",
    speakerHint: "Michael",
  },
  {
    text: "We're focusing on enterprise features - SSO, audit logs, and improved APIs.",
    speakerHint: "You",
  },
  {
    text: "The AI meeting intelligence features are getting great feedback.",
    speakerHint: "You",
  },
  {
    text: "Can you demo the SEGA assistant?",
    speakerHint: "Michael",
  },
  {
    text: "Sure, let me show you how it works in real-time.",
    speakerHint: "You",
  },
  {
    text: "It automatically detects meetings and generates notes.",
    speakerHint: "You",
  },
  {
    text: "This is exactly what our portfolio companies need.",
    speakerHint: "Sarah",
  },
  {
    text: "Let's discuss the Series B timeline.",
    speakerHint: "Sarah",
  },
  {
    text: "We're thinking of starting the process in April.",
    speakerHint: "You",
  },
  {
    text: "Target raise is 15 to 20 million at an 80 to 100 million valuation.",
    speakerHint: "You",
  },
  {
    text: "That seems reasonable given your growth metrics.",
    speakerHint: "Michael",
  },
  {
    text: "We'll definitely want to participate in the round.",
    speakerHint: "Sarah",
  },
  {
    text: "Great, let's schedule a follow-up to kick off the process.",
    speakerHint: "You",
  },
  {
    text: "Action item - send the updated financial model by Friday.",
    speakerHint: "You",
  },
  {
    text: "Sounds good. Thanks for the update, this is exciting progress.",
    speakerHint: "Michael",
  },
  { text: "Thanks everyone, talk soon.", speakerHint: "You" },
];

async function seedDatabase() {
  if (skipDB) {
    console.log("⏭️  Skipping database seeding (--skip-db flag)\n");
    return;
  }

  console.log("1️⃣  Connecting to database...\n");

  try {
    await connectDB();
    if (!isDBConnected()) {
      console.log(
        "⚠️  Database not connected. Set MONGODB_URI to enable persistence.\n",
      );
      return;
    }
    console.log("✅ Database connected\n");
  } catch (error) {
    console.log("⚠️  Failed to connect to database:", error);
    return;
  }

  console.log("2️⃣  Clearing existing demo data...\n");

  try {
    await MeetingModel.deleteMany({ userId });
    await NoteModel.deleteMany({ userId });
    await ActionItemModel.deleteMany({ userId });
    await DailyTranscriptModel.deleteMany({ userId });
    console.log("✅ Cleared existing data\n");
  } catch (error) {
    console.log("⚠️  Failed to clear data:", error);
  }

  console.log("3️⃣  Creating demo meetings...\n");

  const createdMeetings: any[] = [];
  for (const meetingData of DEMO_MEETINGS) {
    try {
      const meeting = await MeetingModel.create({
        userId,
        ...meetingData,
        date: meetingData.startTime.toISOString().split("T")[0],
        transcriptRange: {
          startIndex: 0,
          endIndex: 20,
        },
      });
      createdMeetings.push(meeting);
      console.log(`   ✅ Created meeting: ${meetingData.title}`);
    } catch (error) {
      console.log(
        `   ❌ Failed to create meeting: ${meetingData.title}`,
        error,
      );
    }
  }
  console.log("");

  console.log("4️⃣  Creating demo notes...\n");

  const createdNotes: any[] = [];
  for (let i = 0; i < DEMO_NOTES.length; i++) {
    const noteData = DEMO_NOTES[i];
    const meeting = createdMeetings[i];

    try {
      const note = await NoteModel.create({
        userId,
        meetingId: meeting?._id,
        ...noteData,
        detailLevel: "detailed",
        date:
          meeting?.startTime?.toISOString().split("T")[0] ||
          new Date().toISOString().split("T")[0],
        timeRange: {
          start: meeting?.startTime || new Date(),
          end: meeting?.endTime || new Date(),
        },
      });
      createdNotes.push(note);
      console.log(`   ✅ Created note: ${noteData.title}`);
    } catch (error) {
      console.log(`   ❌ Failed to create note: ${noteData.title}`, error);
    }
  }
  console.log("");

  console.log("5️⃣  Creating demo action items...\n");

  for (let i = 0; i < DEMO_ACTION_ITEMS.length; i++) {
    const actionData = DEMO_ACTION_ITEMS[i];
    const noteIndex = Math.floor(i / 2); // Distribute across notes
    const note = createdNotes[noteIndex];
    const meeting = createdMeetings[noteIndex];

    try {
      await ActionItemModel.create({
        userId,
        meetingId: meeting?._id,
        noteId: note?._id,
        ...actionData,
      });
      console.log(
        `   ✅ Created action: ${actionData.description.substring(0, 40)}...`,
      );
    } catch (error) {
      console.log(
        `   ❌ Failed to create action: ${actionData.description}`,
        error,
      );
    }
  }
  console.log("");

  console.log("6️⃣  Creating demo transcript...\n");

  try {
    const today = new Date().toISOString().split("T")[0];
    const segments = DEMO_TRANSCRIPT_SEGMENTS.map((seg, index) => ({
      text: seg.text,
      timestamp: new Date(
        Date.now() - (DEMO_TRANSCRIPT_SEGMENTS.length - index) * 30000,
      ),
      isFinal: true,
      speakerHint: seg.speakerHint,
      index,
    }));

    await DailyTranscriptModel.create({
      userId,
      date: today,
      segments,
    });
    console.log(`   ✅ Created transcript with ${segments.length} segments\n`);
  } catch (error) {
    console.log("   ❌ Failed to create transcript:", error);
  }

  console.log("✅ Database seeding complete!\n");
}

async function sendDemoEmails() {
  if (skipEmail) {
    console.log("⏭️  Skipping email sending (--skip-email flag)\n");
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("⚠️  No RESEND_API_KEY set - skipping email\n");
    return;
  }

  console.log("7️⃣  Sending demo emails...\n");

  const resend = new Resend(resendApiKey);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "SEGA <onboarding@resend.dev>";

  // Email 1: Meeting Summary
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: userId,
      subject: "Meeting Summary: Q1 Investor Update",
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .metric { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #667eea; }
    .action-item { background: white; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
    .priority-urgent { border-left-color: #ef4444; }
    .priority-high { border-left-color: #f59e0b; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #374151; margin-top: 25px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Q1 Investor Update</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Meeting Summary from SEGA</p>
    </div>
    <div class="content">
      <p><strong>Duration:</strong> 30 minutes &nbsp;|&nbsp; <strong>Attendees:</strong> Sarah Chen, Michael Park</p>

      <h2>📊 Summary</h2>
      <p>Productive investor update covering Q1 results. Revenue grew 45% QoQ to $2.3M ARR. Discussed Series B timeline and hiring plans for engineering team expansion.</p>

      <h2>🎯 Key Metrics</h2>
      <div class="metric">
        <strong>ARR:</strong> $2.3M <span class="badge badge-success">↑45% QoQ</span>
      </div>
      <div class="metric">
        <strong>User Retention:</strong> 94% (above industry average)
      </div>

      <h2>✅ Decisions Made</h2>
      <ul>
        <li>Proceed with Series B fundraising in April</li>
        <li>Hire 5 senior engineers before end of Q2</li>
        <li>Expand to European market in H2</li>
      </ul>

      <h2>📌 Action Items</h2>
      <div class="action-item priority-urgent">
        <strong>Send updated financial model</strong><br>
        <small>Assignee: You &nbsp;|&nbsp; Due: Friday &nbsp;|&nbsp; <span style="color: #ef4444;">URGENT</span></small>
      </div>
      <div class="action-item priority-high">
        <strong>Schedule Series B kick-off meeting</strong><br>
        <small>Assignee: You &nbsp;|&nbsp; Due: Next week &nbsp;|&nbsp; <span style="color: #f59e0b;">HIGH</span></small>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Generated by SEGA • Smart Executive Glasses Assistant<br>
        <a href="#" style="color: #667eea;">View full notes</a> &nbsp;|&nbsp; <a href="#" style="color: #667eea;">Edit</a>
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });
    console.log(`   ✅ Sent meeting summary email: ${result.data?.id}`);
  } catch (error) {
    console.log("   ❌ Failed to send meeting summary:", error);
  }

  // Email 2: Daily Digest
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: userId,
      subject: `SEGA Daily Digest - ${new Date().toLocaleDateString()}`,
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
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #10b981; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    h1 { margin: 0; font-size: 24px; }
    .action-list { background: white; padding: 20px; border-radius: 8px; }
    .action-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .action-item:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Your Daily Digest</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <div class="content">
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-value">3</div>
          <div class="stat-label">Meetings</div>
        </div>
        <div class="stat">
          <div class="stat-value">6</div>
          <div class="stat-label">Action Items</div>
        </div>
        <div class="stat">
          <div class="stat-value">2.5h</div>
          <div class="stat-label">Total Time</div>
        </div>
      </div>

      <h2>📋 Today's Meetings</h2>

      <div class="meeting-card">
        <h3 style="margin: 0 0 10px 0;">Q1 Investor Update</h3>
        <p style="color: #6b7280; margin: 0;">9:00 AM • 30 min • investor_update</p>
        <p style="margin: 10px 0 0 0;">Discussed Q1 results with Sequoia and a16z. Series B kick-off planned for April.</p>
      </div>

      <div class="meeting-card">
        <h3 style="margin: 0 0 10px 0;">Product Roadmap Planning</h3>
        <p style="color: #6b7280; margin: 0;">11:00 AM • 1 hour • team_standup</p>
        <p style="margin: 10px 0 0 0;">Q2 priorities set: Enterprise features, API v2, and design system overhaul.</p>
      </div>

      <div class="meeting-card">
        <h3 style="margin: 0 0 10px 0;">Client Demo - Acme Corp</h3>
        <p style="color: #6b7280; margin: 0;">2:00 PM • 45 min • client_call</p>
        <p style="margin: 10px 0 0 0;">Successful demo. They're interested in enterprise plan for 500 users.</p>
      </div>

      <h2>⚡ Pending Action Items</h2>
      <div class="action-list">
        <div class="action-item">
          <strong>Send updated financial model to investors</strong>
          <div style="color: #6b7280; font-size: 14px;">Due: 2 days • <span style="color: #ef4444;">URGENT</span></div>
        </div>
        <div class="action-item">
          <strong>Send custom proposal to Acme Corp</strong>
          <div style="color: #6b7280; font-size: 14px;">Due: 3 days • <span style="color: #f59e0b;">HIGH</span></div>
        </div>
        <div class="action-item">
          <strong>Scope SSO implementation</strong>
          <div style="color: #6b7280; font-size: 14px;">Assignee: John • In Progress</div>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Generated by SEGA • Smart Executive Glasses Assistant<br>
        <a href="#" style="color: #10b981;">View all notes</a> &nbsp;|&nbsp; <a href="#" style="color: #10b981;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });
    console.log(`   ✅ Sent daily digest email: ${result.data?.id}`);
  } catch (error) {
    console.log("   ❌ Failed to send daily digest:", error);
  }

  // Email 3: Research Results
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: userId,
      subject: "Research Results: Acme Corp",
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .fact-card { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #8b5cf6; }
    .source { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .source-title { color: #8b5cf6; font-weight: 600; text-decoration: none; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #374151; margin-top: 25px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Research: Acme Corp</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Deep research triggered during your meeting</p>
    </div>
    <div class="content">
      <h2>📊 Key Facts</h2>

      <div class="fact-card">
        <strong>Company Overview</strong><br>
        Acme Corp is a Fortune 500 manufacturing company founded in 1952, headquartered in Chicago, IL.
      </div>

      <div class="fact-card">
        <strong>Recent News</strong><br>
        Announced digital transformation initiative in Q4 2024, investing $50M in enterprise software.
      </div>

      <div class="fact-card">
        <strong>Key Contacts</strong><br>
        CEO: John Smith • CTO: Sarah Johnson • VP Sales: Bob Williams
      </div>

      <div class="fact-card">
        <strong>Financials</strong><br>
        Revenue: $2.4B (2024) • Employees: 8,500 • Market Cap: $12B
      </div>

      <h2>📚 Sources</h2>

      <div class="source">
        <a href="#" class="source-title">Acme Corp - Wikipedia</a>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Acme Corporation is an American multinational manufacturing company...</p>
      </div>

      <div class="source">
        <a href="#" class="source-title">Acme Corp Announces Digital Transformation - Reuters</a>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">The company plans to invest $50M in modernizing their technology stack...</p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Generated by SEGA • Smart Executive Glasses Assistant<br>
        Research powered by Firecrawl
      </p>
    </div>
  </div>
</body>
</html>
      `,
    });
    console.log(`   ✅ Sent research results email: ${result.data?.id}`);
  } catch (error) {
    console.log("   ❌ Failed to send research results:", error);
  }

  console.log("");
}

async function main() {
  try {
    await seedDatabase();
    await sendDemoEmails();

    if (!skipDB && isDBConnected()) {
      await disconnectDB();
      console.log("✅ Database disconnected\n");
    }

    console.log("========================================");
    console.log("🎉 Demo seed complete!");
    console.log("========================================\n");
    console.log("Next steps:");
    console.log(`  1. Check email inbox at ${userId}`);
    console.log("  2. Open the Notes page in the webview");
    console.log("  3. You should see 3 meetings with notes");
    console.log("  4. Check the Actions page for action items");
    console.log("");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
