/**
 * MeetingManager
 * Manages meeting lifecycle, detection, and tracking
 *
 * Responsibilities:
 * - Track active meeting state
 * - Store meeting start/end times and transcript ranges
 * - Handle meeting classification
 * - Persist meetings to database
 * - Provide meeting data to other managers
 */

import type {
  Meeting,
  MeetingCategory,
  MeetingStatus,
  MeetingPreset,
} from "./types";
import {
  Meeting as MeetingModel,
  isDBConnected,
  getRecentMeetings as dbGetRecentMeetings,
  getMeetingsByDate as dbGetMeetingsByDate,
} from "../../services/db";

/**
 * Interface for the parts of UserSession that MeetingManager needs
 * This avoids circular dependency issues
 */
export interface MeetingManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  transcript: {
    getCurrentDate: () => string;
    getCurrentIndex: () => number;
    getTextInRange: (startIndex: number, endIndex?: number) => string;
  };
  broadcast: {
    sendMeetingStarted: (
      meetingId: string,
      title: string,
      category: string,
      startTime: Date,
    ) => void;
    sendMeetingEnded: (meetingId: string, durationMs: number) => void;
    broadcast: (data: Record<string, unknown>) => void;
  };
  display: {
    showMeetingStarted: (title: string, category: string) => void;
    showMeetingEnded: (duration: string) => void;
  };
}

/**
 * MeetingManager - handles meeting lifecycle and tracking
 */
export class MeetingManager {
  /** Reference to parent session dependencies */
  private readonly deps: MeetingManagerDeps;

  /** Currently active meeting (if any) */
  private activeMeeting: Meeting | null = null;

  /** Recent meetings cache (for quick access) */
  private recentMeetings: Meeting[] = [];

  /** Maximum meetings to keep in cache */
  private readonly maxCacheSize = 10;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: MeetingManagerDeps) {
    this.deps = deps;
    this.deps.logger.info("[MeetingManager] Initialized");
  }

  // ===========================================================================
  // Meeting State
  // ===========================================================================

  /**
   * Check if there's an active meeting
   */
  isInMeeting(): boolean {
    return this.activeMeeting !== null;
  }

  /**
   * Get the active meeting (if any)
   */
  getActiveMeeting(): Meeting | null {
    return this.activeMeeting ? { ...this.activeMeeting } : null;
  }

  /**
   * Get active meeting ID (if any)
   */
  getActiveMeetingId(): string | undefined {
    return this.activeMeeting?._id;
  }

  // ===========================================================================
  // Meeting Lifecycle
  // ===========================================================================

  /**
   * Start a new meeting
   * Called by AgentManager when meeting is detected
   */
  async startMeeting(options: {
    title: string;
    category: MeetingCategory;
    confidence: number;
    attendees?: string[];
    presetId?: string;
    isSensitive?: boolean;
    sensitiveReason?: string;
  }): Promise<Meeting> {
    // End any existing meeting first
    if (this.activeMeeting) {
      await this.endMeeting();
    }

    const now = new Date();

    // Create new meeting
    const meeting: Meeting = {
      _id: `meeting_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: this.deps.userId,
      title: options.title,
      category: options.category,
      classificationConfidence: options.confidence,
      presetId: options.presetId,
      status: "active",
      startTime: now,
      transcriptDate: this.deps.transcript.getCurrentDate(),
      transcriptStartIndex: this.deps.transcript.getCurrentIndex(),
      attendees: options.attendees || [],
      topics: [],
      isSensitive: options.isSensitive || false,
      sensitiveReason: options.sensitiveReason,
      actionItemIds: [],
      researchIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.activeMeeting = meeting;

    // Broadcast to web UI
    this.deps.broadcast.sendMeetingStarted(
      meeting._id!,
      meeting.title,
      meeting.category,
      meeting.startTime,
    );

    // Show on glasses
    this.deps.display.showMeetingStarted(meeting.title, meeting.category);

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.create({
          _id: meeting._id,
          userId: meeting.userId,
          date: meeting.transcriptDate,
          title: meeting.title,
          category: meeting.category,
          status: meeting.status,
          startTime: meeting.startTime,
          transcriptRange: {
            startIndex: meeting.transcriptStartIndex,
            endIndex: meeting.transcriptEndIndex,
          },
          attendees: meeting.attendees,
          topics: meeting.topics,
          presetId: meeting.presetId,
          isSensitive: meeting.isSensitive,
          sensitiveReason: meeting.sensitiveReason,
          confidence: meeting.classificationConfidence,
        });
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to persist meeting:",
          error,
        );
      }
    }

    this.deps.logger.info(
      `[MeetingManager] Meeting started: ${meeting.title} (${meeting.category})`,
    );

    return meeting;
  }

  /**
   * End the current meeting
   * Called by AgentManager when meeting end is detected
   */
  async endMeeting(): Promise<Meeting | null> {
    if (!this.activeMeeting) {
      return null;
    }

    const meeting = this.activeMeeting;
    const now = new Date();

    // Update meeting
    meeting.status = "ended";
    meeting.endTime = now;
    meeting.transcriptEndIndex = this.deps.transcript.getCurrentIndex();
    meeting.updatedAt = now;

    // Calculate duration
    const durationMs = now.getTime() - meeting.startTime.getTime();
    const durationStr = this.formatDuration(durationMs);

    // Clear active meeting
    this.activeMeeting = null;

    // Add to recent cache
    this.recentMeetings.unshift(meeting);
    if (this.recentMeetings.length > this.maxCacheSize) {
      this.recentMeetings.pop();
    }

    // Broadcast to web UI
    this.deps.broadcast.sendMeetingEnded(meeting._id!, durationMs);

    // Show on glasses
    this.deps.display.showMeetingEnded(durationStr);

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: meeting._id },
          {
            $set: {
              status: "ended",
              endTime: now,
              "transcriptRange.endIndex": meeting.transcriptEndIndex,
            },
          },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to update meeting:",
          error,
        );
      }
    }

    this.deps.logger.info(
      `[MeetingManager] Meeting ended: ${meeting.title} (${durationStr})`,
    );

    return meeting;
  }

  /**
   * Cancel the current meeting (e.g., false positive detection)
   */
  async cancelMeeting(): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    const meeting = this.activeMeeting;
    meeting.status = "cancelled";
    meeting.updatedAt = new Date();

    this.activeMeeting = null;

    // Mark as cancelled in MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: meeting._id },
          { $set: { status: "cancelled" } },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to cancel meeting:",
          error,
        );
      }
    }

    this.deps.logger.info(
      `[MeetingManager] Meeting cancelled: ${meeting.title}`,
    );
  }

  // ===========================================================================
  // Meeting Updates
  // ===========================================================================

  /**
   * Update meeting classification
   */
  async updateClassification(
    category: MeetingCategory,
    confidence: number,
    preset?: MeetingPreset,
  ): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    this.activeMeeting.category = category;
    this.activeMeeting.classificationConfidence = confidence;
    this.activeMeeting.presetId = preset?._id;
    this.activeMeeting.updatedAt = new Date();

    // Check if preset marks as sensitive
    if (preset?.sensitive) {
      this.activeMeeting.isSensitive = true;
      this.activeMeeting.sensitiveReason = preset.sensitiveReason;
    }

    // Broadcast update
    this.deps.broadcast.broadcast({
      type: "meeting_classified",
      meetingId: this.activeMeeting._id,
      category,
      confidence,
      presetId: preset?._id,
    });

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          {
            $set: {
              category,
              confidence,
              presetId: preset?._id,
              isSensitive: this.activeMeeting.isSensitive,
              sensitiveReason: this.activeMeeting.sensitiveReason,
            },
          },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to update classification:",
          error,
        );
      }
    }

    this.deps.logger.info(
      `[MeetingManager] Classification updated: ${category} (${(confidence * 100).toFixed(0)}%)`,
    );
  }

  /**
   * Add topics to the meeting
   */
  async addTopics(topics: string[]): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    // Add unique topics
    const existingTopics = new Set(this.activeMeeting.topics);
    for (const topic of topics) {
      if (!existingTopics.has(topic)) {
        this.activeMeeting.topics.push(topic);
      }
    }

    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $addToSet: { topics: { $each: topics } } },
        );
      } catch (error) {
        this.deps.logger.error("[MeetingManager] Failed to add topics:", error);
      }
    }
  }

  /**
   * Add attendees to the meeting
   */
  async addAttendees(attendees: string[]): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    // Add unique attendees
    const existingAttendees = new Set(this.activeMeeting.attendees);
    for (const attendee of attendees) {
      if (!existingAttendees.has(attendee)) {
        this.activeMeeting.attendees.push(attendee);
      }
    }

    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $addToSet: { attendees: { $each: attendees } } },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to add attendees:",
          error,
        );
      }
    }
  }

  /**
   * Mark meeting as sensitive
   */
  async markAsSensitive(reason: string): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    this.activeMeeting.isSensitive = true;
    this.activeMeeting.sensitiveReason = reason;
    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $set: { isSensitive: true, sensitiveReason: reason } },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to mark as sensitive:",
          error,
        );
      }
    }

    this.deps.logger.info(
      `[MeetingManager] Meeting marked as sensitive: ${reason}`,
    );
  }

  /**
   * Link a note to the meeting
   */
  async linkNote(noteId: string): Promise<void> {
    if (!this.activeMeeting) {
      // Try to find in recent meetings
      const meeting = this.recentMeetings[0];
      if (meeting) {
        meeting.noteId = noteId;
        meeting.updatedAt = new Date();
      }
      return;
    }

    this.activeMeeting.noteId = noteId;
    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $set: { noteId } },
        );
      } catch (error) {
        this.deps.logger.error("[MeetingManager] Failed to link note:", error);
      }
    }
  }

  /**
   * Link an action item to the meeting
   */
  async linkActionItem(actionItemId: string): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    this.activeMeeting.actionItemIds.push(actionItemId);
    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $push: { actionItemIds: actionItemId } },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to link action item:",
          error,
        );
      }
    }
  }

  /**
   * Link a research result to the meeting
   */
  async linkResearch(researchId: string): Promise<void> {
    if (!this.activeMeeting) {
      return;
    }

    this.activeMeeting.researchIds.push(researchId);
    this.activeMeeting.updatedAt = new Date();

    // Persist to MongoDB if connected
    if (isDBConnected()) {
      try {
        await MeetingModel.updateOne(
          { _id: this.activeMeeting._id },
          { $push: { researchIds: researchId } },
        );
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to link research:",
          error,
        );
      }
    }
  }

  // ===========================================================================
  // Meeting Retrieval
  // ===========================================================================

  /**
   * Get the transcript text for a meeting
   */
  getMeetingTranscript(meeting: Meeting): string {
    return this.deps.transcript.getTextInRange(
      meeting.transcriptStartIndex,
      meeting.transcriptEndIndex,
    );
  }

  /**
   * Get recent meetings from cache
   */
  getRecentMeetings(): Meeting[] {
    return [...this.recentMeetings];
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<Meeting | null> {
    // Check active meeting
    if (this.activeMeeting?._id === meetingId) {
      return { ...this.activeMeeting };
    }

    // Check cache
    const cached = this.recentMeetings.find((m) => m._id === meetingId);
    if (cached) {
      return { ...cached };
    }

    // Query MongoDB if connected
    if (isDBConnected()) {
      try {
        const dbMeeting = await MeetingModel.findOne({
          _id: meetingId,
          userId: this.deps.userId,
        });
        if (dbMeeting) {
          return this.dbMeetingToMeeting(dbMeeting);
        }
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to get meeting:",
          error,
        );
      }
    }

    return null;
  }

  /**
   * Get meetings for a date
   */
  async getMeetingsForDate(date: string): Promise<Meeting[]> {
    // Query MongoDB if connected
    if (isDBConnected()) {
      try {
        const dbMeetings = await dbGetMeetingsByDate(this.deps.userId, date);
        return dbMeetings.map((m) => this.dbMeetingToMeeting(m));
      } catch (error) {
        this.deps.logger.error(
          "[MeetingManager] Failed to get meetings for date:",
          error,
        );
      }
    }

    // Fallback: filter from cache
    return this.recentMeetings.filter((m) => m.transcriptDate === date);
  }

  /**
   * Get the most recent meeting (ended)
   */
  getMostRecentMeeting(): Meeting | null {
    return this.recentMeetings[0] || null;
  }

  // ===========================================================================
  // Meeting Stats
  // ===========================================================================

  /**
   * Get meeting duration in milliseconds
   */
  getMeetingDuration(meeting: Meeting): number {
    const endTime = meeting.endTime || new Date();
    return endTime.getTime() - meeting.startTime.getTime();
  }

  /**
   * Get current meeting duration (if active)
   */
  getCurrentMeetingDuration(): number {
    if (!this.activeMeeting) {
      return 0;
    }
    return Date.now() - this.activeMeeting.startTime.getTime();
  }

  // ===========================================================================
  // Private Helpers
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
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${seconds}s`;
  }

  /**
   * Convert DB meeting to our Meeting type
   */
  private dbMeetingToMeeting(dbMeeting: any): Meeting {
    return {
      _id: dbMeeting._id?.toString() || dbMeeting.id,
      userId: dbMeeting.userId,
      title: dbMeeting.title,
      category: dbMeeting.category as MeetingCategory,
      classificationConfidence: dbMeeting.confidence || 0,
      presetId: dbMeeting.presetId,
      status: dbMeeting.status as MeetingStatus,
      startTime: dbMeeting.startTime,
      endTime: dbMeeting.endTime,
      transcriptDate: dbMeeting.date,
      transcriptStartIndex: dbMeeting.transcriptRange?.startIndex || 0,
      transcriptEndIndex: dbMeeting.transcriptRange?.endIndex,
      attendees: dbMeeting.attendees || [],
      topics: dbMeeting.topics || [],
      isSensitive: dbMeeting.isSensitive || false,
      sensitiveReason: dbMeeting.sensitiveReason,
      noteId: dbMeeting.noteId,
      actionItemIds: dbMeeting.actionItemIds || [],
      researchIds: dbMeeting.researchIds || [],
      createdAt: dbMeeting.createdAt,
      updatedAt: dbMeeting.updatedAt,
    };
  }

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // End any active meeting
    if (this.activeMeeting) {
      this.endMeeting().catch((err) => {
        this.deps.logger.error(
          "[MeetingManager] Error ending meeting on dispose:",
          err,
        );
      });
    }

    this.deps.logger.info("[MeetingManager] Disposed");
  }
}
