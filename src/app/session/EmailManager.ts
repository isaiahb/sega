/**
 * EmailManager
 * Sends emails via Resend for meeting summaries, reports, and notifications
 *
 * Responsibilities:
 * - Send meeting summary emails after meetings end
 * - Send daily digest emails
 * - Send action item reminders
 * - Send research results
 * - Track email status and delivery
 */

import { Resend } from "resend";
import type { Meeting, Note, ActionItem, ResearchResult } from "./types";

/**
 * Interface for the parts of UserSession that EmailManager needs
 */
export interface EmailManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  settings: {
    getSettings: () => { emailSummaries?: boolean; email?: string };
  };
  broadcast: {
    broadcast: (data: Record<string, unknown>) => void;
  };
}

/** Email template types */
export type EmailTemplate =
  | "meeting_summary"
  | "daily_digest"
  | "action_items"
  | "research_results"
  | "custom";

/** Email send options */
export interface EmailOptions {
  to?: string; // Override recipient
  subject?: string; // Override subject
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/** Email result */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * EmailManager - sends emails via Resend
 */
export class EmailManager {
  /** Reference to parent session dependencies */
  private readonly deps: EmailManagerDeps;

  /** Resend client */
  private resend: Resend | null = null;

  /** From email address */
  private fromEmail: string;

  /** Whether email is available */
  private emailAvailable: boolean = false;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  /** Email queue for batch sending */
  private emailQueue: Array<{
    template: EmailTemplate;
    data: Record<string, unknown>;
    options?: EmailOptions;
  }> = [];

  constructor(deps: EmailManagerDeps) {
    this.deps = deps;

    // Initialize Resend if API key is available
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail =
      process.env.RESEND_FROM_EMAIL || "SEGA <onboarding@resend.dev>";

    if (apiKey) {
      try {
        this.resend = new Resend(apiKey);
        this.emailAvailable = true;
        this.deps.logger.info("[EmailManager] Resend initialized");
      } catch (error) {
        this.deps.logger.warn(
          "[EmailManager] Failed to initialize Resend:",
          error,
        );
      }
    } else {
      this.deps.logger.warn(
        "[EmailManager] No RESEND_API_KEY - email disabled",
      );
    }

    this.deps.logger.info("[EmailManager] Initialized");
  }

  // ===========================================================================
  // Email Availability
  // ===========================================================================

  /**
   * Check if email is available
   */
  isAvailable(): boolean {
    return this.emailAvailable;
  }

  /**
   * Get the default recipient email
   * Falls back to userId which is the user's email
   */
  getDefaultRecipient(): string {
    const settings = this.deps.settings.getSettings();
    return settings.email || this.deps.userId;
  }

  /**
   * Check if user has email summaries enabled
   * Defaults to true for demo
   */
  isEmailSummariesEnabled(): boolean {
    const settings = this.deps.settings.getSettings();
    return settings.emailSummaries !== false; // Default to true
  }

  // ===========================================================================
  // Meeting Summary Email
  // ===========================================================================

  /**
   * Send meeting summary email
   */
  async sendMeetingSummary(
    meeting: Meeting,
    note: Note,
    actionItems: ActionItem[],
    options?: EmailOptions,
  ): Promise<EmailResult> {
    if (!this.emailAvailable || !this.resend) {
      return { success: false, error: "Email not available" };
    }

    const recipient = options?.to || this.getDefaultRecipient();

    this.deps.logger.info(
      `[EmailManager] Sending meeting summary to: ${recipient}`,
    );

    try {
      const subject = options?.subject || `Meeting Summary: ${meeting.title}`;
      const html = this.renderMeetingSummaryEmail(meeting, note, actionItems);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipient,
        subject,
        html,
        replyTo: options?.replyTo,
        cc: options?.cc,
        bcc: options?.bcc,
      });

      if (result.error) {
        this.deps.logger.error(
          "[EmailManager] Failed to send meeting summary:",
          result.error,
        );
        return { success: false, error: result.error.message };
      }

      this.deps.logger.info(
        `[EmailManager] Meeting summary sent: ${result.data?.id}`,
      );

      // Broadcast email sent event
      this.deps.broadcast.broadcast({
        type: "email_sent",
        template: "meeting_summary",
        meetingId: meeting._id,
        messageId: result.data?.id,
      });

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      this.deps.logger.error(
        "[EmailManager] Error sending meeting summary:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Render meeting summary email HTML
   */
  private renderMeetingSummaryEmail(
    meeting: Meeting,
    note: Note,
    actionItems: ActionItem[],
  ): string {
    const duration = meeting.endTime
      ? this.formatDuration(
          meeting.endTime.getTime() - meeting.startTime.getTime(),
        )
      : "In progress";

    const actionItemsHtml =
      actionItems.length > 0
        ? `
      <h3 style="color: #1a1a1a; margin-top: 24px;">Action Items</h3>
      <ul style="padding-left: 20px;">
        ${actionItems
          .map(
            (item) => `
          <li style="margin-bottom: 8px;">
            <strong>${this.escapeHtml(item.description)}</strong>
            ${item.assignee ? `<br><span style="color: #666;">Assigned to: ${this.escapeHtml(item.assignee)}</span>` : ""}
            ${item.dueDate ? `<br><span style="color: #666;">Due: ${new Date(item.dueDate).toLocaleDateString()}</span>` : ""}
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; background: ${this.getPriorityColor(item.priority)}; color: white;">${item.priority}</span>
          </li>
        `,
          )
          .join("")}
      </ul>
    `
        : "";

    const keyPointsHtml =
      note.keyPoints && note.keyPoints.length > 0
        ? `
      <h3 style="color: #1a1a1a; margin-top: 24px;">Key Points</h3>
      <ul style="padding-left: 20px;">
        ${note.keyPoints.map((point) => `<li style="margin-bottom: 4px;">${this.escapeHtml(point)}</li>`).join("")}
      </ul>
    `
        : "";

    const decisionsHtml =
      note.decisions && note.decisions.length > 0
        ? `
      <h3 style="color: #1a1a1a; margin-top: 24px;">Decisions Made</h3>
      <ul style="padding-left: 20px;">
        ${note.decisions.map((decision) => `<li style="margin-bottom: 4px;">${this.escapeHtml(decision)}</li>`).join("")}
      </ul>
    `
        : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">📋 Meeting Summary</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">${this.escapeHtml(meeting.title)}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="display: flex; gap: 24px; margin-bottom: 24px;">
      <div>
        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Date</span>
        <div style="font-weight: 500;">${new Date(meeting.startTime).toLocaleDateString()}</div>
      </div>
      <div>
        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Duration</span>
        <div style="font-weight: 500;">${duration}</div>
      </div>
      <div>
        <span style="color: #666; font-size: 12px; text-transform: uppercase;">Category</span>
        <div style="font-weight: 500;">${this.formatCategory(meeting.category)}</div>
      </div>
    </div>

    ${
      meeting.attendees && meeting.attendees.length > 0
        ? `
    <div style="margin-bottom: 24px;">
      <span style="color: #666; font-size: 12px; text-transform: uppercase;">Attendees</span>
      <div style="font-weight: 500;">${meeting.attendees.map((a) => this.escapeHtml(a)).join(", ")}</div>
    </div>
    `
        : ""
    }

    <h3 style="color: #1a1a1a; margin-top: 0;">Summary</h3>
    <p style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
      ${this.escapeHtml(note.summary || "No summary available.")}
    </p>

    ${keyPointsHtml}
    ${decisionsHtml}
    ${actionItemsHtml}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
      Generated by SEGA - Smart Executive Glasses Assistant<br>
      <a href="#" style="color: #667eea;">View full notes in app</a>
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  // ===========================================================================
  // Daily Digest Email
  // ===========================================================================

  /**
   * Send daily digest email
   */
  async sendDailyDigest(
    date: string,
    meetings: Meeting[],
    notes: Note[],
    pendingActions: ActionItem[],
    options?: EmailOptions,
  ): Promise<EmailResult> {
    if (!this.emailAvailable || !this.resend) {
      return { success: false, error: "Email not available" };
    }

    const recipient = options?.to || this.getDefaultRecipient();
    if (!recipient) {
      return { success: false, error: "No recipient email configured" };
    }

    try {
      const subject = options?.subject || `SEGA Daily Digest - ${date}`;
      const html = this.renderDailyDigestEmail(
        date,
        meetings,
        notes,
        pendingActions,
      );

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipient,
        subject,
        html,
      });

      if (result.error) {
        this.deps.logger.error(
          "[EmailManager] Failed to send daily digest:",
          result.error,
        );
        return { success: false, error: result.error.message };
      }

      this.deps.logger.info(
        `[EmailManager] Daily digest sent: ${result.data?.id}`,
      );

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      this.deps.logger.error(
        "[EmailManager] Error sending daily digest:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Render daily digest email HTML
   */
  private renderDailyDigestEmail(
    date: string,
    meetings: Meeting[],
    notes: Note[],
    pendingActions: ActionItem[],
  ): string {
    const meetingsHtml =
      meetings.length > 0
        ? `
      <h3 style="color: #1a1a1a;">📅 Meetings (${meetings.length})</h3>
      ${meetings
        .map(
          (m) => `
        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
          <strong>${this.escapeHtml(m.title)}</strong>
          <div style="color: #666; font-size: 14px;">
            ${new Date(m.startTime).toLocaleTimeString()} • ${this.formatCategory(m.category)}
          </div>
        </div>
      `,
        )
        .join("")}
    `
        : "<p>No meetings today.</p>";

    const actionsHtml =
      pendingActions.length > 0
        ? `
      <h3 style="color: #1a1a1a;">✅ Pending Action Items (${pendingActions.length})</h3>
      <ul style="padding-left: 20px;">
        ${pendingActions
          .slice(0, 10)
          .map(
            (item) => `
          <li style="margin-bottom: 8px;">
            ${this.escapeHtml(item.description)}
            ${item.dueDate ? `<span style="color: #666;"> (Due: ${new Date(item.dueDate).toLocaleDateString()})</span>` : ""}
          </li>
        `,
          )
          .join("")}
      </ul>
      ${pendingActions.length > 10 ? `<p style="color: #666;">...and ${pendingActions.length - 10} more</p>` : ""}
    `
        : "<p>No pending action items! 🎉</p>";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">📊 Daily Digest</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">${date}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    ${meetingsHtml}
    ${actionsHtml}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
      Generated by SEGA - Smart Executive Glasses Assistant
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  // ===========================================================================
  // Research Results Email
  // ===========================================================================

  /**
   * Send research results email
   */
  async sendResearchResults(
    research: ResearchResult,
    options?: EmailOptions,
  ): Promise<EmailResult> {
    if (!this.emailAvailable || !this.resend) {
      return { success: false, error: "Email not available" };
    }

    const recipient = options?.to || this.getDefaultRecipient();
    if (!recipient) {
      return { success: false, error: "No recipient email configured" };
    }

    try {
      const subject = options?.subject || `Research Results: ${research.query}`;
      const html = this.renderResearchEmail(research);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipient,
        subject,
        html,
      });

      if (result.error) {
        this.deps.logger.error(
          "[EmailManager] Failed to send research results:",
          result.error,
        );
        return { success: false, error: result.error.message };
      }

      this.deps.logger.info(
        `[EmailManager] Research results sent: ${result.data?.id}`,
      );

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      this.deps.logger.error(
        "[EmailManager] Error sending research results:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Render research results email HTML
   */
  private renderResearchEmail(research: ResearchResult): string {
    const keyFactsHtml =
      research.keyFacts && research.keyFacts.length > 0
        ? `
      <h3 style="color: #1a1a1a;">Key Facts</h3>
      <ul style="padding-left: 20px;">
        ${research.keyFacts.map((fact) => `<li style="margin-bottom: 4px;">${this.escapeHtml(fact)}</li>`).join("")}
      </ul>
    `
        : "";

    const sourcesHtml =
      research.sources && research.sources.length > 0
        ? `
      <h3 style="color: #1a1a1a;">Sources</h3>
      ${research.sources
        .slice(0, 5)
        .map(
          (source) => `
        <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 8px;">
          <a href="${this.escapeHtml(source.url)}" style="color: #667eea; font-weight: 500;">${this.escapeHtml(source.title)}</a>
          <p style="color: #666; font-size: 14px; margin: 4px 0 0 0;">${this.escapeHtml(source.snippet?.substring(0, 150) || "")}...</p>
        </div>
      `,
        )
        .join("")}
    `
        : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🔍 Research Results</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">${this.escapeHtml(research.query)}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; background: #e0e7ff; color: #3730a3; margin-bottom: 16px;">
      ${research.type}
    </div>

    <h3 style="color: #1a1a1a; margin-top: 0;">Summary</h3>
    <p style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
      ${this.escapeHtml(research.summary || "No summary available.")}
    </p>

    ${keyFactsHtml}
    ${sourcesHtml}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
      Generated by SEGA - Smart Executive Glasses Assistant
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  // ===========================================================================
  // Custom Email
  // ===========================================================================

  /**
   * Send a custom email
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    html: string,
    options?: Omit<EmailOptions, "to" | "subject">,
  ): Promise<EmailResult> {
    if (!this.emailAvailable || !this.resend) {
      return { success: false, error: "Email not available" };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        replyTo: options?.replyTo,
        cc: options?.cc,
        bcc: options?.bcc,
      });

      if (result.error) {
        this.deps.logger.error(
          "[EmailManager] Failed to send custom email:",
          result.error,
        );
        return { success: false, error: result.error.message };
      }

      this.deps.logger.info(
        `[EmailManager] Custom email sent: ${result.data?.id}`,
      );

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      this.deps.logger.error(
        "[EmailManager] Error sending custom email:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Format meeting category for display
   */
  private formatCategory(category: string): string {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Get priority color
   */
  private getPriorityColor(priority: string): string {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#ca8a04";
      case "low":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.emailQueue = [];
    this.deps.logger.info("[EmailManager] Disposed");
  }
}
