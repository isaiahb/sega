/**
 * TranscriptManager
 * Buffers transcript segments and periodically flushes to DailyTranscript in MongoDB
 *
 * Responsibilities:
 * - Receive transcript segments from MentraOS
 * - Buffer segments in memory (minimize DB writes)
 * - Flush to DailyTranscript every 5 minutes or on demand
 * - Provide access to recent transcript for analysis
 * - Track segment indices for meeting references
 */

import type { TranscriptSegment, DailyTranscript } from "./types";

/**
 * Interface for the parts of UserSession that TranscriptManager needs
 * This avoids circular dependency issues
 */
export interface TranscriptManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  broadcast: {
    sendTranscript: (
      text: string,
      isFinal: boolean,
      speakerHint?: string,
    ) => void;
  };
}

/** How often to flush buffer to database (ms) */
const FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/** Maximum segments to keep in memory buffer before forcing flush */
const MAX_BUFFER_SIZE = 500;

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * TranscriptManager - handles transcript buffering and persistence
 */
export class TranscriptManager {
  /** Reference to parent session dependencies */
  private readonly deps: TranscriptManagerDeps;

  /** In-memory buffer of transcript segments */
  private buffer: TranscriptSegment[] = [];

  /** Timer for periodic flush */
  private flushTimer?: ReturnType<typeof setInterval>;

  /** Current date string for tracking day changes */
  private currentDate: string;

  /** Total segment count for the current day (for indexing) */
  private daySegmentCount: number = 0;

  /** Whether there are unflushed changes */
  private isDirty: boolean = false;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: TranscriptManagerDeps) {
    this.deps = deps;
    this.currentDate = getTodayDateString();

    // Start periodic flush timer
    this.flushTimer = setInterval(() => {
      this.flushToDatabase().catch((err) => {
        this.deps.logger.error("[TranscriptManager] Flush error:", err);
      });
    }, FLUSH_INTERVAL);

    this.deps.logger.info("[TranscriptManager] Initialized");
  }

  /**
   * Add a new transcript segment
   * Called when glasses send transcription data
   */
  addSegment(
    text: string,
    isFinal: boolean,
    speakerHint?: string,
  ): TranscriptSegment {
    // Check for day change
    const today = getTodayDateString();
    if (today !== this.currentDate) {
      // Day changed - flush old buffer and reset
      this.flushToDatabase().catch((err) => {
        this.deps.logger.error(
          "[TranscriptManager] Day change flush error:",
          err,
        );
      });
      this.currentDate = today;
      this.daySegmentCount = 0;
    }

    // Create segment with index
    const segment: TranscriptSegment = {
      text,
      timestamp: new Date(),
      isFinal,
      speakerHint,
      index: this.daySegmentCount,
    };

    // Add to buffer
    this.buffer.push(segment);
    this.daySegmentCount++;
    this.isDirty = true;

    // Broadcast to web UI
    this.deps.broadcast.sendTranscript(text, isFinal, speakerHint);

    // Force flush if buffer is too large
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flushToDatabase().catch((err) => {
        this.deps.logger.error(
          "[TranscriptManager] Buffer overflow flush error:",
          err,
        );
      });
    }

    return segment;
  }

  /**
   * Get recent transcript segments from buffer
   * @param count Number of segments to retrieve (default: all buffered)
   * @param finalOnly Only return final (non-interim) segments
   */
  getRecentSegments(
    count?: number,
    finalOnly: boolean = false,
  ): TranscriptSegment[] {
    let segments = this.buffer;

    if (finalOnly) {
      segments = segments.filter((s) => s.isFinal);
    }

    if (count !== undefined && count < segments.length) {
      return segments.slice(-count);
    }

    return [...segments];
  }

  /**
   * Get recent transcript as a single string
   * @param count Number of segments to include
   * @param finalOnly Only include final segments
   */
  getRecentText(count?: number, finalOnly: boolean = true): string {
    const segments = this.getRecentSegments(count, finalOnly);
    return segments.map((s) => s.text).join(" ");
  }

  /**
   * Get transcript text within a range of indices
   * Used for meeting transcript retrieval
   */
  getTextInRange(startIndex: number, endIndex?: number): string {
    const segments = this.buffer.filter((s) => {
      if (s.index === undefined) return false;
      if (s.index < startIndex) return false;
      if (endIndex !== undefined && s.index > endIndex) return false;
      return s.isFinal;
    });

    return segments.map((s) => s.text).join(" ");
  }

  /**
   * Get the current segment index (for meeting start tracking)
   */
  getCurrentIndex(): number {
    return this.daySegmentCount;
  }

  /**
   * Get the current date string
   */
  getCurrentDate(): string {
    return this.currentDate;
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Check if there are unflushed changes
   */
  hasPendingChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Flush buffer to database
   * Creates or updates the DailyTranscript document
   */
  async flushToDatabase(): Promise<void> {
    if (!this.isDirty || this.buffer.length === 0) {
      return;
    }

    const finalSegments = this.buffer.filter((s) => s.isFinal);
    if (finalSegments.length === 0) {
      return;
    }

    this.deps.logger.info(
      `[TranscriptManager] Flushing ${finalSegments.length} segments to database`,
    );

    try {
      // TODO: Implement MongoDB persistence
      // For now, just log and mark as flushed
      //
      // const db = await getDatabase();
      // await db.collection('daily_transcripts').updateOne(
      //   { userId: this.userSession.userId, date: this.currentDate },
      //   {
      //     $push: { segments: { $each: finalSegments } },
      //     $setOnInsert: { createdAt: new Date() },
      //     $set: { updatedAt: new Date() }
      //   },
      //   { upsert: true }
      // );

      // Clear flushed segments from buffer (keep interim ones)
      this.buffer = this.buffer.filter((s) => !s.isFinal);
      this.isDirty = this.buffer.length > 0;

      this.deps.logger.info("[TranscriptManager] Flush complete");
    } catch (error) {
      this.deps.logger.error(
        "[TranscriptManager] Database flush failed:",
        error,
      );
      throw error;
    }
  }

  /**
   * Force immediate flush (used before meeting end, app shutdown, etc.)
   */
  async forceFlush(): Promise<void> {
    await this.flushToDatabase();
  }

  /**
   * Clear the buffer (use with caution)
   */
  clearBuffer(): void {
    this.buffer = [];
    this.isDirty = false;
  }

  /**
   * Get the full daily transcript from database
   * @param date Optional date string (defaults to today)
   */
  async getDailyTranscript(date?: string): Promise<DailyTranscript | null> {
    const targetDate = date || this.currentDate;

    // TODO: Implement MongoDB retrieval
    // const db = await getDatabase();
    // return db.collection('daily_transcripts').findOne({
    //   userId: this.userSession.userId,
    //   date: targetDate
    // });

    // For now, return buffer as a mock daily transcript
    if (targetDate === this.currentDate) {
      return {
        userId: this.deps.userId,
        date: this.currentDate,
        segments: this.buffer.filter((s) => s.isFinal),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Dispose of the manager and clean up resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    try {
      await this.flushToDatabase();
    } catch (error) {
      this.deps.logger.error("[TranscriptManager] Final flush error:", error);
    }

    this.deps.logger.info("[TranscriptManager] Disposed");
  }
}
