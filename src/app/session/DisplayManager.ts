/**
 * DisplayManager
 * Controls what is displayed on the smart glasses
 *
 * Responsibilities:
 * - Show/hide live transcript on glasses
 * - Display status messages and notifications
 * - Show meeting indicators
 * - Display research results and summaries
 * - Manage display timing and animations
 */

import type { AppSession } from "@mentra/sdk";

/**
 * Interface for the parts of UserSession that DisplayManager needs
 * This avoids circular dependency issues
 */
export interface DisplayManagerDeps {
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  appSession: AppSession | null;
}

/** Default duration for temporary messages (ms) */
const DEFAULT_MESSAGE_DURATION = 3000;

/** Duration for longer messages (ms) */
const LONG_MESSAGE_DURATION = 5000;

/**
 * Display priority levels
 * Higher priority messages can interrupt lower priority ones
 */
export type DisplayPriority = "low" | "normal" | "high" | "urgent";

/**
 * DisplayManager - controls glasses display
 */
export class DisplayManager {
  /** Reference to parent session dependencies */
  private readonly deps: DisplayManagerDeps;

  /** Whether live transcript display is enabled */
  private transcriptEnabled: boolean = true;

  /** Current message being displayed */
  private currentMessage: string | null = null;

  /** Current display priority */
  private currentPriority: DisplayPriority = "low";

  /** Timer for auto-clearing messages */
  private clearTimer?: ReturnType<typeof setTimeout>;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: DisplayManagerDeps) {
    this.deps = deps;
    this.deps.logger.info("[DisplayManager] Initialized");
  }

  /**
   * Get the MentraOS AppSession for display operations
   */
  private get appSession(): AppSession | null {
    return this.deps.appSession;
  }

  // ===========================================================================
  // Transcript Display
  // ===========================================================================

  /**
   * Enable live transcript display on glasses
   */
  enableTranscript(): void {
    this.transcriptEnabled = true;
    this.deps.logger.info("[DisplayManager] Transcript display enabled");
  }

  /**
   * Disable live transcript display on glasses
   */
  disableTranscript(): void {
    this.transcriptEnabled = false;
    this.clearDisplay();
    this.deps.logger.info("[DisplayManager] Transcript display disabled");
  }

  /**
   * Check if transcript display is enabled
   */
  isTranscriptEnabled(): boolean {
    return this.transcriptEnabled;
  }

  /**
   * Display transcript text (if enabled)
   */
  showTranscript(text: string): void {
    if (!this.transcriptEnabled) return;
    if (!this.appSession) return;

    // Only show if no higher priority message is displayed
    if (this.currentPriority !== "low" && this.currentMessage) {
      return;
    }

    this.appSession.layouts.showTextWall(text);
  }

  // ===========================================================================
  // Status Messages
  // ===========================================================================

  /**
   * Show a temporary message on the glasses
   */
  showMessage(
    text: string,
    options: {
      duration?: number;
      priority?: DisplayPriority;
    } = {},
  ): void {
    const { duration = DEFAULT_MESSAGE_DURATION, priority = "normal" } =
      options;

    // Check priority - don't interrupt higher priority messages
    if (this.shouldSkipMessage(priority)) {
      return;
    }

    this.displayText(text, priority);

    // Set up auto-clear
    this.scheduleClear(duration, priority);
  }

  /**
   * Show a status indicator (brief flash)
   */
  showStatus(text: string): void {
    this.showMessage(text, { duration: 2000, priority: "low" });
  }

  /**
   * Show an important notification
   */
  showNotification(text: string): void {
    this.showMessage(text, {
      duration: LONG_MESSAGE_DURATION,
      priority: "high",
    });
  }

  /**
   * Show an urgent alert
   */
  showAlert(text: string): void {
    this.showMessage(text, {
      duration: LONG_MESSAGE_DURATION,
      priority: "urgent",
    });
  }

  // ===========================================================================
  // Meeting Display
  // ===========================================================================

  /**
   * Show meeting started indicator
   */
  showMeetingStarted(title: string, category: string): void {
    const emoji = this.getCategoryEmoji(category);
    this.showMessage(`${emoji} Meeting: ${title}`, {
      duration: 3000,
      priority: "high",
    });
  }

  /**
   * Show meeting ended indicator
   */
  showMeetingEnded(duration: string): void {
    this.showMessage(`✅ Meeting ended (${duration})`, {
      duration: 3000,
      priority: "high",
    });
  }

  /**
   * Show notes generating indicator
   */
  showNotesGenerating(): void {
    this.showMessage("📝 Generating notes...", {
      duration: 5000,
      priority: "normal",
    });
  }

  /**
   * Show notes ready indicator
   */
  showNotesReady(): void {
    this.showMessage("✅ Notes ready!", {
      duration: 3000,
      priority: "high",
    });
  }

  // ===========================================================================
  // Research Display
  // ===========================================================================

  /**
   * Show research in progress
   */
  showResearchProgress(query: string, progress: number): void {
    const progressBar = this.makeProgressBar(progress);
    this.showMessage(`🔍 Researching:\n${query}\n${progressBar}`, {
      duration: 10000,
      priority: "normal",
    });
  }

  /**
   * Show research complete
   */
  showResearchComplete(summary: string): void {
    // Truncate summary for glasses display
    const truncated = this.truncateForDisplay(summary, 100);
    this.showMessage(`✅ Research:\n${truncated}`, {
      duration: LONG_MESSAGE_DURATION,
      priority: "high",
    });
  }

  // ===========================================================================
  // State Display
  // ===========================================================================

  /**
   * Show SEGA ready state
   */
  showReady(): void {
    this.showStatus("SEGA Ready 🎯");
  }

  /**
   * Show listening state
   */
  showListening(): void {
    this.showStatus("Listening...");
  }

  /**
   * Show processing state
   */
  showProcessing(): void {
    this.showMessage("Processing... 🤔", {
      duration: 10000,
      priority: "normal",
    });
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.showAlert(`❌ ${message}`);
  }

  // ===========================================================================
  // Low-Level Display
  // ===========================================================================

  /**
   * Clear the display
   */
  clearDisplay(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = undefined;
    }

    this.currentMessage = null;
    this.currentPriority = "low";

    if (this.appSession) {
      this.appSession.layouts.showTextWall("");
    }
  }

  /**
   * Show text directly on the glasses (raw access)
   */
  showTextWall(text: string, durationMs?: number): void {
    if (!this.appSession) return;

    this.appSession.layouts.showTextWall(text, { durationMs });
  }

  /**
   * Show a reference card (title + body)
   */
  showReferenceCard(title: string, body: string, durationMs?: number): void {
    if (!this.appSession) return;

    this.appSession.layouts.showReferenceCard(title, body, { durationMs });
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Display text with priority tracking
   */
  private displayText(text: string, priority: DisplayPriority): void {
    this.currentMessage = text;
    this.currentPriority = priority;

    if (this.appSession) {
      this.appSession.layouts.showTextWall(text);
    }
  }

  /**
   * Schedule clearing the display
   */
  private scheduleClear(duration: number, priority: DisplayPriority): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }

    this.clearTimer = setTimeout(() => {
      // Only clear if this is still the current message priority
      if (this.currentPriority === priority) {
        this.currentMessage = null;
        this.currentPriority = "low";

        // Return to transcript display if enabled
        if (this.transcriptEnabled && this.appSession) {
          this.appSession.layouts.showTextWall("");
        }
      }
    }, duration);
  }

  /**
   * Check if a message should be skipped due to priority
   */
  private shouldSkipMessage(priority: DisplayPriority): boolean {
    if (!this.currentMessage) return false;

    const priorities: DisplayPriority[] = ["low", "normal", "high", "urgent"];
    const currentIndex = priorities.indexOf(this.currentPriority);
    const newIndex = priorities.indexOf(priority);

    return newIndex < currentIndex;
  }

  /**
   * Get emoji for meeting category
   */
  private getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      investor_update: "💰",
      board_meeting: "🏛️",
      one_on_one: "👥",
      team_standup: "🏃",
      client_call: "📞",
      interview: "🎤",
      networking: "🤝",
      personal: "🏠",
      unknown: "📋",
    };
    return emojis[category] || "📋";
  }

  /**
   * Create a simple progress bar
   */
  private makeProgressBar(progress: number): string {
    const filled = Math.round(progress / 10);
    const empty = 10 - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`;
  }

  /**
   * Truncate text for glasses display
   */
  private truncateForDisplay(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Try to break at a sentence
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastPeriod > maxLength * 0.6) {
      return truncated.substring(0, lastPeriod + 1);
    }

    if (lastSpace > maxLength * 0.6) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  }

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = undefined;
    }

    this.deps.logger.info("[DisplayManager] Disposed");
  }
}
