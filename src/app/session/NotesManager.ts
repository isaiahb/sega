/**
 * NotesManager
 * Generates meeting notes and extracts action items
 *
 * Responsibilities:
 * - Generate notes when meetings end (based on preset rules)
 * - Extract action items from meeting transcripts
 * - Format notes according to preset detail level
 * - Persist notes and action items to database
 * - Notify web UI when notes are ready
 */

import type {
  Note,
  NoteDetailLevel,
  ActionItem,
  ActionItemPriority,
  MeetingPreset,
  Meeting,
} from "./types";
import {
  createProviderFromEnv,
  extractText,
  type AgentProvider,
  type UnifiedMessage,
} from "../../services/llm";

/**
 * Interface for the parts of UserSession that NotesManager needs
 */
export interface NotesManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  transcript: {
    getTextInRange: (startIndex: number, endIndex?: number) => string;
  };
  meeting: {
    getMeetingById: (meetingId: string) => Promise<Meeting | null>;
    getMeetingTranscript: (meeting: Meeting) => string;
    linkNote: (noteId: string) => Promise<void>;
    linkActionItem: (actionItemId: string) => Promise<void>;
  };
  settings: {
    getPreset: (presetId: string) => MeetingPreset | undefined;
    getPresetForCategory: (category: string) => MeetingPreset | undefined;
    isEmailSummariesEnabled?: () => boolean;
    getEmailAddress?: () => string | undefined;
  };
  broadcast: {
    sendNotesReady: (
      noteId: string,
      meetingId: string,
      title: string,
      summary: string,
    ) => void;
    broadcast: (data: Record<string, unknown>) => void;
  };
  display: {
    showNotesGenerating: () => void;
    showNotesReady: () => void;
    showError: (message: string) => void;
    showMessage?: (text: string, options?: { duration?: number }) => void;
  };
  // Optional email manager for sending summaries
  email?: {
    sendMeetingSummary: (
      meeting: Meeting,
      note: Note,
      actionItems: ActionItem[],
    ) => Promise<boolean>;
  };
}

/** Notes generation prompt template */
const NOTES_GENERATION_PROMPT = `You are an AI assistant that generates meeting notes from transcripts.

Meeting Information:
- Title: {{TITLE}}
- Category: {{CATEGORY}}
- Duration: {{DURATION}}
- Attendees: {{ATTENDEES}}

User Context:
{{USER_CONTEXT}}

Note Generation Rules:
- Detail Level: {{DETAIL_LEVEL}}
- Capture Decisions: {{CAPTURE_DECISIONS}}
- Capture Action Items: {{CAPTURE_ACTION_ITEMS}}
{{CUSTOM_INSTRUCTIONS}}

Meeting Transcript:
"""
{{TRANSCRIPT}}
"""

Generate meeting notes following this JSON structure (respond with ONLY valid JSON, no markdown):
{
  "title": "string - meeting title",
  "summary": "string - 2-3 sentence summary of the meeting",
  "keyPoints": ["array of key points discussed"],
  "decisions": ["array of decisions made (if capture_decisions is true)"],
  "actionItems": [
    {
      "description": "what needs to be done",
      "assignee": "who is responsible (if mentioned)",
      "dueDate": "due date if mentioned (ISO format or null)",
      "priority": "low | medium | high | urgent",
      "sourceText": "the quote from transcript that indicates this action"
    }
  ],
  "content": "string - full formatted notes in markdown"
}

For detail level:
- "brief": Focus only on decisions and action items, minimal summary
- "standard": Include key points, decisions, and action items with context
- "detailed": Comprehensive notes with full context, quotes, and discussion flow`;

/**
 * NotesManager - generates meeting notes and extracts action items
 */
export class NotesManager {
  /** Reference to parent session dependencies */
  private readonly deps: NotesManagerDeps;

  /** LLM provider for note generation */
  private provider: AgentProvider | null = null;

  /** Notes cache (recent notes for quick access) */
  private notesCache: Map<string, Note> = new Map();

  /** Action items cache */
  private actionItemsCache: Map<string, ActionItem[]> = new Map();

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: NotesManagerDeps) {
    this.deps = deps;

    // Try to initialize LLM provider
    try {
      this.provider = createProviderFromEnv();
      this.deps.logger.info("[NotesManager] LLM provider initialized");
    } catch (error) {
      this.deps.logger.warn(
        "[NotesManager] No LLM provider available - note generation disabled",
      );
    }

    this.deps.logger.info("[NotesManager] Initialized");
  }

  // ===========================================================================
  // Note Generation
  // ===========================================================================

  /**
   * Generate notes for a meeting
   */
  async generateNotes(meetingId: string): Promise<Note | null> {
    if (!this.provider) {
      this.deps.logger.error("[NotesManager] No LLM provider available");
      return null;
    }

    // Get meeting
    const meeting = await this.deps.meeting.getMeetingById(meetingId);
    if (!meeting) {
      this.deps.logger.error(`[NotesManager] Meeting not found: ${meetingId}`);
      return null;
    }

    this.deps.display.showNotesGenerating();
    this.deps.logger.info(
      `[NotesManager] Generating notes for: ${meeting.title}`,
    );

    // Get transcript
    const transcript = this.deps.meeting.getMeetingTranscript(meeting);
    if (!transcript || transcript.length < 50) {
      this.deps.logger.warn("[NotesManager] Transcript too short for notes");
      return null;
    }

    // Get preset for note rules
    const preset = meeting.presetId
      ? this.deps.settings.getPreset(meeting.presetId)
      : this.deps.settings.getPresetForCategory(meeting.category);

    const noteRules = preset?.noteRules || {
      detailLevel: "standard" as NoteDetailLevel,
      captureDecisions: true,
      captureActionItems: true,
    };

    try {
      // Generate notes with LLM
      const result = await this.generateWithLLM(
        meeting,
        transcript,
        preset,
        noteRules,
      );

      if (!result) {
        this.deps.display.showError("Note generation failed");
        return null;
      }

      // Create note object
      const note: Note = {
        _id: `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: this.deps.userId,
        meetingId: meeting._id!,
        title: result.title || meeting.title,
        summary: result.summary || "",
        keyPoints: result.keyPoints || [],
        decisions: result.decisions || [],
        content: result.content || "",
        detailLevel: noteRules.detailLevel,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Cache note
      this.notesCache.set(note._id!, note);

      // Link note to meeting
      await this.deps.meeting.linkNote(note._id!);

      // Process action items
      const actionItems = await this.processActionItems(
        result.actionItems || [],
        meeting._id!,
        note._id!,
      );

      // Cache action items
      this.actionItemsCache.set(meeting._id!, actionItems);

      // TODO: Persist to MongoDB
      // const db = await getDatabase();
      // await db.collection('notes').insertOne(note);
      // await db.collection('action_items').insertMany(actionItems);

      // Notify UI
      this.deps.display.showNotesReady();
      this.deps.broadcast.sendNotesReady(
        note._id!,
        meeting._id!,
        note.title,
        note.summary,
      );

      this.deps.logger.info(
        `[NotesManager] Notes generated: ${note.title} (${actionItems.length} action items)`,
      );

      // Auto-send email summary if enabled
      await this.sendEmailSummaryIfEnabled(meeting, note, actionItems);

      return note;
    } catch (error) {
      this.deps.logger.error("[NotesManager] Note generation failed:", error);
      this.deps.display.showError("Note generation failed");
      return null;
    }
  }

  /**
   * Send email summary if enabled in settings
   */
  private async sendEmailSummaryIfEnabled(
    meeting: Meeting,
    note: Note,
    actionItems: ActionItem[],
  ): Promise<void> {
    // Check if email is available and enabled
    if (!this.deps.email) {
      this.deps.logger.info(
        "[NotesManager] Email manager not available, skipping email",
      );
      return;
    }

    const emailEnabled = this.deps.settings.isEmailSummariesEnabled?.() ?? true; // Default to enabled for demo
    if (!emailEnabled) {
      this.deps.logger.info(
        "[NotesManager] Email summaries disabled in settings",
      );
      return;
    }

    try {
      this.deps.display.showMessage?.("📧 Sending email summary...", {
        duration: 3000,
      });

      const sent = await this.deps.email.sendMeetingSummary(
        meeting,
        note,
        actionItems,
      );

      if (sent) {
        this.deps.logger.info("[NotesManager] Email summary sent successfully");
        this.deps.display.showMessage?.("✅ Email sent!", { duration: 2000 });
        this.deps.broadcast.broadcast({
          type: "email_sent",
          meetingId: meeting._id,
          noteId: note._id,
          timestamp: Date.now(),
        });
      } else {
        this.deps.logger.warn("[NotesManager] Email sending returned false");
      }
    } catch (error) {
      this.deps.logger.error(
        "[NotesManager] Failed to send email summary:",
        error,
      );
      // Don't show error to user - email is optional
    }
  }

  /**
   * Generate notes using LLM
   */
  private async generateWithLLM(
    meeting: Meeting,
    transcript: string,
    preset: MeetingPreset | undefined,
    noteRules: {
      detailLevel: NoteDetailLevel;
      captureDecisions: boolean;
      captureActionItems: boolean;
      customInstructions?: string;
    },
  ): Promise<{
    title: string;
    summary: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: Array<{
      description: string;
      assignee?: string;
      dueDate?: string;
      priority: ActionItemPriority;
      sourceText?: string;
    }>;
    content: string;
  } | null> {
    if (!this.provider) return null;

    // Calculate duration
    const durationMs = meeting.endTime
      ? meeting.endTime.getTime() - meeting.startTime.getTime()
      : 0;
    const durationStr = this.formatDuration(durationMs);

    // Build prompt
    const prompt = NOTES_GENERATION_PROMPT.replace("{{TITLE}}", meeting.title)
      .replace("{{CATEGORY}}", meeting.category)
      .replace("{{DURATION}}", durationStr)
      .replace("{{ATTENDEES}}", meeting.attendees.join(", ") || "Unknown")
      .replace(
        "{{USER_CONTEXT}}",
        preset?.userContext || "No specific context provided",
      )
      .replace("{{DETAIL_LEVEL}}", noteRules.detailLevel)
      .replace("{{CAPTURE_DECISIONS}}", String(noteRules.captureDecisions))
      .replace("{{CAPTURE_ACTION_ITEMS}}", String(noteRules.captureActionItems))
      .replace(
        "{{CUSTOM_INSTRUCTIONS}}",
        noteRules.customInstructions
          ? `- Custom Instructions: ${noteRules.customInstructions}`
          : "",
      )
      .replace("{{TRANSCRIPT}}", transcript);

    const messages: UnifiedMessage[] = [{ role: "user", content: prompt }];

    try {
      const response = await this.provider.chat(messages, {
        tier: "smart", // Use smart tier for better note quality
        maxTokens: 4096,
        temperature: 0.5,
      });

      const text = extractText(response);
      return this.parseNotesResponse(text);
    } catch (error) {
      this.deps.logger.error("[NotesManager] LLM call failed:", error);
      return null;
    }
  }

  /**
   * Parse LLM response into notes structure
   */
  private parseNotesResponse(text: string): {
    title: string;
    summary: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: Array<{
      description: string;
      assignee?: string;
      dueDate?: string;
      priority: ActionItemPriority;
      sourceText?: string;
    }>;
    content: string;
  } | null {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.deps.logger.warn("[NotesManager] No JSON found in response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: parsed.title || "",
        summary: parsed.summary || "",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.map((item: any) => ({
              description: item.description || "",
              assignee: item.assignee,
              dueDate: item.dueDate,
              priority: this.validatePriority(item.priority),
              sourceText: item.sourceText,
            }))
          : [],
        content: parsed.content || "",
      };
    } catch (error) {
      this.deps.logger.error(
        "[NotesManager] Failed to parse notes response:",
        error,
      );
      return null;
    }
  }

  /**
   * Validate and normalize priority
   */
  private validatePriority(priority: string): ActionItemPriority {
    const valid: ActionItemPriority[] = ["low", "medium", "high", "urgent"];
    const lower = (priority || "medium").toLowerCase();
    return valid.includes(lower as ActionItemPriority)
      ? (lower as ActionItemPriority)
      : "medium";
  }

  /**
   * Process action items from LLM response
   */
  private async processActionItems(
    items: Array<{
      description: string;
      assignee?: string;
      dueDate?: string;
      priority: ActionItemPriority;
      sourceText?: string;
    }>,
    meetingId: string,
    noteId: string,
  ): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];

    for (const item of items) {
      const actionItem: ActionItem = {
        _id: `action_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: this.deps.userId,
        meetingId,
        noteId,
        description: item.description,
        assignee: item.assignee,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        priority: item.priority,
        status: "pending",
        sourceText: item.sourceText,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      actionItems.push(actionItem);

      // Link to meeting
      await this.deps.meeting.linkActionItem(actionItem._id!);

      // Broadcast action item
      this.deps.broadcast.broadcast({
        type: "action_item",
        actionItem: {
          id: actionItem._id,
          description: actionItem.description,
          assignee: actionItem.assignee,
          priority: actionItem.priority,
        },
      });
    }

    return actionItems;
  }

  // ===========================================================================
  // Note Retrieval
  // ===========================================================================

  /**
   * Get all cached notes (for API to return when DB is empty)
   */
  getAllCachedNotes(): Note[] {
    return Array.from(this.notesCache.values());
  }

  /**
   * Get all cached action items (for API to return when DB is empty)
   */
  getAllCachedActionItems(): ActionItem[] {
    const allItems: ActionItem[] = [];
    for (const items of this.actionItemsCache.values()) {
      allItems.push(...items);
    }
    return allItems;
  }

  /**
   * Get note by ID
   */
  async getNoteById(noteId: string): Promise<Note | null> {
    // Check cache first
    if (this.notesCache.has(noteId)) {
      return this.notesCache.get(noteId)!;
    }

    // TODO: Query MongoDB
    // const db = await getDatabase();
    // return db.collection('notes').findOne({ _id: noteId, userId: this.deps.userId });

    return null;
  }

  /**
   * Get notes for a meeting
   */
  async getNotesForMeeting(meetingId: string): Promise<Note | null> {
    // Check cache
    for (const note of this.notesCache.values()) {
      if (note.meetingId === meetingId) {
        return note;
      }
    }

    // TODO: Query MongoDB
    return null;
  }

  /**
   * Get action items for a meeting
   */
  async getActionItemsForMeeting(meetingId: string): Promise<ActionItem[]> {
    // Check cache
    if (this.actionItemsCache.has(meetingId)) {
      return this.actionItemsCache.get(meetingId)!;
    }

    // TODO: Query MongoDB
    return [];
  }

  /**
   * Get all pending action items for user
   */
  async getPendingActionItems(): Promise<ActionItem[]> {
    // Collect from cache
    const pending: ActionItem[] = [];
    for (const items of this.actionItemsCache.values()) {
      pending.push(...items.filter((item) => item.status === "pending"));
    }

    // TODO: Query MongoDB for complete list
    return pending;
  }

  // ===========================================================================
  // Action Item Management
  // ===========================================================================

  /**
   * Update action item status
   */
  async updateActionItemStatus(
    actionItemId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled",
  ): Promise<void> {
    // Update in cache
    for (const items of this.actionItemsCache.values()) {
      const item = items.find((i) => i._id === actionItemId);
      if (item) {
        item.status = status;
        item.updatedAt = new Date();
        break;
      }
    }

    // TODO: Persist to MongoDB

    this.deps.logger.info(
      `[NotesManager] Action item ${actionItemId} status updated to ${status}`,
    );
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Format duration as human-readable string
   */
  private formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m`;
    }

    return `${seconds}s`;
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

    this.notesCache.clear();
    this.actionItemsCache.clear();

    this.deps.logger.info("[NotesManager] Disposed");
  }
}
