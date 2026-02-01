/**
 * UserSession
 * Container for all per-user managers in a SEGA session
 *
 * This is the central hub that:
 * - Holds references to all managers for a single user
 * - Provides cross-manager access via the userSession reference
 * - Manages lifecycle (initialization and disposal)
 * - Exposes common user info (userId, logger, appSession)
 */

import type { AppSession } from "@mentra/sdk";
import { TranscriptManager } from "./TranscriptManager";
import { BroadcastManager } from "./BroadcastManager";
import { DisplayManager } from "./DisplayManager";
import { SettingsManager } from "./SettingsManager";
import { MeetingManager } from "./MeetingManager";
import { AgentManager } from "./AgentManager";
import { NotesManager } from "./NotesManager";
import { ResearchManager } from "./ResearchManager";
import { EmailManager } from "./EmailManager";

/**
 * Logger interface for session logging
 */
export interface SessionLogger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

/**
 * UserSession - container for all per-user managers
 */
export class UserSession {
  // ===========================================================================
  // Static Session Management
  // ===========================================================================

  /** Active sessions by userId */
  private static readonly sessions: Map<string, UserSession> = new Map();

  /**
   * Get or create a UserSession for a user
   */
  static async getOrCreate(
    userId: string,
    appSession: AppSession,
  ): Promise<UserSession> {
    let session = UserSession.sessions.get(userId);

    if (!session) {
      session = new UserSession(userId, appSession);
      UserSession.sessions.set(userId, session);
      await session.initialize();
    } else {
      // Update appSession reference (in case of reconnect)
      session.updateAppSession(appSession);
    }

    return session;
  }

  /**
   * Get an existing session (without creating)
   */
  static get(userId: string): UserSession | undefined {
    return UserSession.sessions.get(userId);
  }

  /**
   * Remove a session
   */
  static async remove(userId: string): Promise<void> {
    const session = UserSession.sessions.get(userId);
    if (session) {
      await session.dispose();
      UserSession.sessions.delete(userId);
    }
  }

  /**
   * Get all active user IDs
   */
  static getActiveUserIds(): string[] {
    return Array.from(UserSession.sessions.keys());
  }

  /**
   * Get count of active sessions
   */
  static getActiveSessionCount(): number {
    return UserSession.sessions.size;
  }

  // ===========================================================================
  // Instance Properties
  // ===========================================================================

  /** User ID (email) */
  readonly userId: string;

  /** MentraOS AppSession reference */
  private _appSession: AppSession;

  /** Session logger */
  readonly logger: SessionLogger;

  // ---------------------------------------------------------------------------
  // Managers (initialized in constructor, fully set up in initialize())
  // ---------------------------------------------------------------------------

  /** Transcript buffering and persistence */
  readonly transcript: TranscriptManager;

  /** SSE broadcasting to web UI */
  readonly broadcast: BroadcastManager;

  /** Glasses display control */
  readonly display: DisplayManager;

  /** User settings, presets, sensitive topics */
  readonly settings: SettingsManager;

  /** Meeting lifecycle and tracking */
  readonly meeting: MeetingManager;

  /** AI agent - the brain that orchestrates SEGA */
  readonly agent: AgentManager;

  /** Note generation and action item extraction */
  readonly notes: NotesManager;

  /** Deep web research using Firecrawl */
  readonly research: ResearchManager;

  /** Email sending via Resend */
  readonly email: EmailManager;

  /** Whether the session has been initialized */
  private initialized: boolean = false;

  /** Whether the session has been disposed */
  private disposed: boolean = false;

  // ===========================================================================
  // Constructor
  // ===========================================================================

  private constructor(userId: string, appSession: AppSession) {
    this.userId = userId;
    this._appSession = appSession;

    // Create logger that prefixes with userId
    this.logger = this.createLogger(userId, appSession);

    // Initialize managers in order (some depend on others)
    // BroadcastManager is standalone
    this.broadcast = new BroadcastManager(userId);

    // DisplayManager needs logger, appSession, and broadcast
    this.display = new DisplayManager({
      logger: this.logger,
      appSession: this._appSession,
      broadcast: this.broadcast,
    });

    // TranscriptManager needs userId, logger, and broadcast
    this.transcript = new TranscriptManager({
      userId: this.userId,
      logger: this.logger,
      broadcast: this.broadcast,
    });

    // SettingsManager needs userId, logger, and display
    this.settings = new SettingsManager({
      userId: this.userId,
      logger: this.logger,
      display: this.display,
    });

    // MeetingManager needs userId, logger, transcript, broadcast, and display
    this.meeting = new MeetingManager({
      userId: this.userId,
      logger: this.logger,
      transcript: this.transcript,
      broadcast: this.broadcast,
      display: this.display,
    });

    // NotesManager needs userId, logger, transcript, meeting, settings, broadcast, display
    this.notes = new NotesManager({
      userId: this.userId,
      logger: this.logger,
      transcript: this.transcript,
      meeting: this.meeting,
      settings: this.settings,
      broadcast: this.broadcast,
      display: this.display,
    });

    // ResearchManager needs userId, logger, meeting, broadcast, display
    this.research = new ResearchManager({
      userId: this.userId,
      logger: this.logger,
      meeting: this.meeting,
      broadcast: this.broadcast,
      display: this.display,
    });

    // EmailManager needs userId, logger, settings, broadcast
    this.email = new EmailManager({
      userId: this.userId,
      logger: this.logger,
      settings: this.settings,
      broadcast: this.broadcast,
    });

    // AgentManager needs userId, logger, transcript, meeting, settings, broadcast, display, notes, research
    this.agent = new AgentManager({
      userId: this.userId,
      logger: this.logger,
      transcript: this.transcript,
      meeting: this.meeting,
      settings: this.settings,
      broadcast: this.broadcast,
      display: this.display,
      notes: this.notes,
      research: this.research,
    });

    this.logger.info(`[UserSession] Created for ${userId}`);
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  /**
   * Get the MentraOS AppSession
   */
  get appSession(): AppSession {
    return this._appSession;
  }

  /**
   * Check if session is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if session is disposed
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the session (async setup)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info("[UserSession] Initializing...");

    try {
      // Load settings from database
      await this.settings.load();

      // Apply settings to display
      if (this.settings.isLiveTranscriptEnabled()) {
        this.display.enableTranscript();
      } else {
        this.display.disableTranscript();
      }

      // TODO: Load any persisted state (active meeting, etc.)

      // Start the agent analysis loop
      this.agent.start();

      this.initialized = true;
      this.logger.info("[UserSession] Initialized successfully");

      // Notify any already-connected webview clients that a session is now active
      // This uses broadcastToUser which sends to ALL clients for this userId
      this.broadcast.broadcast({
        type: "session_started",
        userId: this.userId,
        hasActiveSession: true,
        timestamp: Date.now(),
      });
      this.logger.info(
        "[UserSession] Broadcasted session_started to any waiting webview clients",
      );

      // Show ready state on glasses
      this.display.showReady();
    } catch (error) {
      this.logger.error("[UserSession] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Update the AppSession reference (on reconnect)
   */
  private updateAppSession(appSession: AppSession): void {
    this._appSession = appSession;
    this.logger.info("[UserSession] AppSession updated (reconnect)");
  }

  /**
   * Dispose of the session and all managers
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    this.logger.info("[UserSession] Disposing...");

    try {
      // Dispose managers in reverse order of dependency
      this.agent.dispose();
      this.email.dispose();
      this.research.dispose();
      this.notes.dispose();
      this.meeting.dispose();
      this.settings.dispose();
      this.display.dispose();
      await this.transcript.dispose();
      this.broadcast.dispose();

      this.logger.info("[UserSession] Disposed successfully");
    } catch (error) {
      this.logger.error("[UserSession] Error during disposal:", error);
    }
  }

  // ===========================================================================
  // Transcription Handling
  // ===========================================================================

  /**
   * Handle incoming transcription from glasses
   * This is the main entry point for transcript data
   *
   * Enhanced: Now uses processAndDisplayTranscript for proper streaming
   * with interim updates, speaker diarization, and smooth display.
   */
  onTranscription(text: string, isFinal: boolean, speakerId?: string): void {
    if (this.disposed) return;

    // Add to transcript buffer
    const segment = this.transcript.addSegment(text, isFinal, speakerId);

    // Show on glasses with enhanced streaming display
    // This handles both interim and final transcripts properly
    this.display.processAndDisplayTranscript(text, isFinal, speakerId);

    // Notify AgentManager for analysis (only on final)
    if (isFinal) {
      this.agent.onNewTranscript(segment);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Create a prefixed logger for this session
   */
  private createLogger(userId: string, appSession: AppSession): SessionLogger {
    const prefix = `[${userId}]`;

    // Use AppSession logger if available, otherwise console
    const baseLogger = appSession.logger || console;

    return {
      info: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          console.log(`${prefix} ${message}`, ...args);
        } else {
          baseLogger.info(`${prefix} ${message}`);
        }
      },
      warn: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          console.warn(`${prefix} ${message}`, ...args);
        } else {
          baseLogger.warn(`${prefix} ${message}`);
        }
      },
      error: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          console.error(`${prefix} ${message}`, ...args);
        } else {
          baseLogger.error(`${prefix} ${message}`);
        }
      },
      debug: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          console.debug(`${prefix} [DEBUG] ${message}`, ...args);
        } else {
          console.debug(`${prefix} [DEBUG] ${message}`);
        }
      },
    };
  }
}
