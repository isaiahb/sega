/**
 * DisplayManager
 * Controls what is displayed on the smart glasses
 *
 * Enhanced with proper transcript streaming from live-captions:
 * - Interim + final transcript handling with smooth updates
 * - Speaker diarization support with [N]: labels
 * - Device profile detection (G1, Z100, NEX)
 * - Proper text wrapping using display-utils
 * - Inactivity timeout to clear old transcripts
 *
 * Responsibilities:
 * - Show/hide live transcript on glasses
 * - Display status messages and notifications
 * - Show meeting indicators
 * - Display research results and summaries
 * - Manage display timing and animations
 */

import {
  ViewType,
  type AppSession,
  type DeviceState,
  type Observable,
} from "@mentra/sdk";

import {
  TextMeasurer,
  TextWrapper,
  G1_PROFILE,
  type DisplayProfile,
} from "@mentra/sdk/display-utils";

// Try to import Z100 and NEX profiles (may not be available in all setups)
let Z100_PROFILE: DisplayProfile = G1_PROFILE;
let NEX_PROFILE: DisplayProfile = G1_PROFILE;

try {
  // @ts-ignore - types work at runtime
  const displayUtils = require("@mentra/display-utils");
  if (displayUtils.Z100_PROFILE) Z100_PROFILE = displayUtils.Z100_PROFILE;
  if (displayUtils.NEX_PROFILE) NEX_PROFILE = displayUtils.NEX_PROFILE;
} catch {
  // Use G1 as fallback
}

/**
 * Interface for the parts of UserSession that DisplayManager needs
 */
export interface DisplayManagerDeps {
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
  };
  appSession: AppSession | null;
  broadcast?: {
    broadcast: (data: Record<string, unknown>) => void;
  };
}

/** Default duration for temporary messages (ms) */
const DEFAULT_MESSAGE_DURATION = 3000;

/** Duration for longer messages (ms) */
const LONG_MESSAGE_DURATION = 5000;

/** Inactivity timeout before clearing transcript (ms) */
const INACTIVITY_TIMEOUT = 40000;

/** Maximum final transcripts to keep in history */
const MAX_FINAL_TRANSCRIPTS = 30;

/**
 * Display priority levels
 */
export type DisplayPriority = "low" | "normal" | "high" | "urgent";

/**
 * Transcript history entry with speaker info
 */
interface TranscriptHistoryEntry {
  text: string;
  speakerId?: string;
  hadSpeakerChange: boolean;
}

/**
 * Device type with state
 */
interface DeviceWithState {
  state: DeviceState;
}

/**
 * Get display profile for device model
 */
function getProfileForModel(
  modelName: string | null | undefined,
): DisplayProfile {
  if (!modelName) return G1_PROFILE;

  const lower = modelName.toLowerCase();

  if (
    lower.includes("g1") ||
    lower.includes("even realities") ||
    lower.includes("even_g1")
  ) {
    return G1_PROFILE;
  }

  if (
    lower.includes("z100") ||
    lower.includes("vuzix") ||
    lower.includes("mach1") ||
    lower.includes("mach 1")
  ) {
    return Z100_PROFILE;
  }

  if (
    lower.includes("nex") ||
    lower.includes("mentra display") ||
    lower.includes("mentra_nex")
  ) {
    return NEX_PROFILE;
  }

  return G1_PROFILE;
}

/**
 * Get device model name from AppSession
 */
function getDeviceModelName(appSession: AppSession): string | null {
  try {
    const device = appSession.device as DeviceWithState | undefined;
    const deviceState = device?.state;

    if (deviceState?.modelName) {
      const modelNameObservable = deviceState.modelName as Observable<
        string | null
      >;
      return modelNameObservable.value || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Subscribe to device model changes
 */
function subscribeToDeviceModel(
  appSession: AppSession,
  callback: (modelName: string | null) => void,
): (() => void) | null {
  try {
    const device = appSession.device as DeviceWithState | undefined;
    const deviceState = device?.state;

    if (deviceState?.modelName) {
      const modelNameObservable = deviceState.modelName as Observable<
        string | null
      >;
      if (modelNameObservable.onChange) {
        return modelNameObservable.onChange(callback);
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * DisplayManager - controls glasses display with enhanced transcript streaming
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

  /** Inactivity timer for clearing transcripts */
  private inactivityTimer?: ReturnType<typeof setTimeout>;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  // === Transcript Display State ===

  /** Current display profile (detected from connected glasses) */
  private currentProfile: DisplayProfile = G1_PROFILE;

  /** Text measurer for the current profile */
  private measurer: TextMeasurer;

  /** Text wrapper for the current profile */
  private wrapper: TextWrapper;

  /** Final transcript history with speaker info */
  private finalTranscriptHistory: TranscriptHistoryEntry[] = [];

  /** Partial (interim) transcript state */
  private partialSpeakerId: string | undefined = undefined;
  private partialHadSpeakerChange: boolean = false;

  /** Last speaker ID for change detection */
  private lastSpeakerId: string | undefined = undefined;

  /** Display settings */
  private displayWidthPx: number;
  private maxLines: number;

  /** Device state subscription cleanup */
  private deviceStateCleanup: (() => void) | null = null;

  constructor(deps: DisplayManagerDeps) {
    this.deps = deps;

    // Detect initial device model
    let initialProfile = G1_PROFILE;
    if (deps.appSession) {
      const modelName = getDeviceModelName(deps.appSession);
      initialProfile = getProfileForModel(modelName);
      this.deps.logger.info(
        `[DisplayManager] Detected device: ${modelName || "unknown"} -> profile ${initialProfile.id}`,
      );
    }

    this.currentProfile = initialProfile;
    this.displayWidthPx = initialProfile.displayWidthPx;
    this.maxLines = initialProfile.maxLines;

    // Initialize text utilities
    this.measurer = new TextMeasurer(initialProfile);
    this.wrapper = new TextWrapper(this.measurer, {
      breakMode: "character",
      hyphenChar: "-",
      minCharsBeforeHyphen: 3,
    });

    // Subscribe to device changes
    if (deps.appSession) {
      this.subscribeToDeviceChanges();
    }

    this.deps.logger.info("[DisplayManager] Initialized");
  }

  /**
   * Get the MentraOS AppSession for display operations
   */
  private get appSession(): AppSession | null {
    return this.deps.appSession;
  }

  // ===========================================================================
  // Device Profile Management
  // ===========================================================================

  /**
   * Subscribe to device state changes
   */
  private subscribeToDeviceChanges(): void {
    if (!this.appSession) return;

    this.deviceStateCleanup = subscribeToDeviceModel(
      this.appSession,
      (modelName: string | null) => {
        const newProfile = getProfileForModel(modelName);
        if (newProfile.id !== this.currentProfile.id) {
          this.deps.logger.info(
            `[DisplayManager] Device changed: ${modelName} -> profile ${newProfile.id}`,
          );
          this.updateProfile(newProfile);
        }
      },
    );
  }

  /**
   * Update the display profile
   */
  private updateProfile(newProfile: DisplayProfile): void {
    this.currentProfile = newProfile;
    this.displayWidthPx = newProfile.displayWidthPx;
    this.maxLines = Math.min(this.maxLines, newProfile.maxLines);

    // Recreate text utilities
    this.measurer = new TextMeasurer(newProfile);
    this.wrapper = new TextWrapper(this.measurer, {
      breakMode: "character",
      hyphenChar: "-",
      minCharsBeforeHyphen: 3,
    });

    // Refresh display with new profile
    this.refreshTranscriptDisplay();
  }

  // ===========================================================================
  // Transcript Display (Enhanced from live-captions)
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
    this.clearTranscriptHistory();
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
   * Process and display transcript text (main entry point for transcript streaming)
   * @param text - The transcription text
   * @param isFinal - Whether this is a final transcription
   * @param speakerId - Optional speaker ID from diarization
   */
  processAndDisplayTranscript(
    text: string,
    isFinal: boolean,
    speakerId?: string,
  ): void {
    if (!this.transcriptEnabled) return;

    // Don't show transcript if a higher priority message is displayed
    if (this.currentPriority !== "low" && this.currentMessage) {
      return;
    }

    // Detect speaker change
    const speakerChanged =
      speakerId !== undefined && speakerId !== this.lastSpeakerId;
    if (speakerChanged && speakerId) {
      this.deps.logger.debug(
        `[DisplayManager] Speaker changed: ${this.lastSpeakerId || "none"} -> ${speakerId}`,
      );
      this.lastSpeakerId = speakerId;
    }

    // Process transcription
    const displayText = isFinal
      ? this.processFinalTranscript(text, speakerId, speakerChanged)
      : this.processInterimTranscript(text, speakerId, speakerChanged);

    // Show on glasses
    this.showTranscriptOnGlasses(displayText, isFinal);

    // Reset inactivity timer
    this.resetInactivityTimer();

    // Broadcast to webview
    this.broadcastDisplayPreview(displayText, isFinal);
  }

  /**
   * Process an interim (non-final) transcript
   */
  private processInterimTranscript(
    text: string,
    speakerId?: string,
    speakerChanged?: boolean,
  ): string {
    // Track speaker info for this partial
    if (speakerChanged && speakerId) {
      this.partialSpeakerId = speakerId;
      this.partialHadSpeakerChange = true;
    } else if (speakerId && speakerId !== this.partialSpeakerId) {
      this.partialSpeakerId = speakerId;
      this.partialHadSpeakerChange = true;
    }

    // Build display text from history + partial
    return this.buildDisplayText(
      text,
      this.partialSpeakerId,
      this.partialHadSpeakerChange,
    );
  }

  /**
   * Process a final transcript
   */
  private processFinalTranscript(
    text: string,
    speakerId?: string,
    speakerChanged?: boolean,
  ): string {
    // Use tracked partial speaker info if available
    const finalSpeakerId = speakerId || this.partialSpeakerId;
    const finalSpeakerChanged = speakerChanged || this.partialHadSpeakerChange;

    // Clear partial speaker tracking
    this.partialSpeakerId = undefined;
    this.partialHadSpeakerChange = false;

    // Add to transcript history
    if (text && text.trim()) {
      this.addToHistory(text.trim(), finalSpeakerId, finalSpeakerChanged);
    }

    // Build display text from history only
    return this.buildDisplayText("", undefined, false);
  }

  /**
   * Build display text from history and optional partial text
   * Adds speaker labels [N]: when speaker changes
   */
  private buildDisplayText(
    partialText: string,
    partialSpeakerId?: string,
    partialSpeakerChanged?: boolean,
  ): string {
    let result = "";

    // Add history entries with speaker labels
    for (const entry of this.finalTranscriptHistory) {
      if (entry.hadSpeakerChange && entry.speakerId) {
        // Speaker change: add newline before label (if not at start)
        if (result.length > 0) {
          result += "\n";
        }
        result += `[${entry.speakerId}]: ${entry.text}`;
      } else {
        // Same speaker: append with space
        if (result.length > 0) {
          result += " ";
        }
        result += entry.text;
      }
    }

    // Add partial text if present
    if (partialText) {
      if (partialSpeakerChanged && partialSpeakerId) {
        if (result.length > 0) {
          result += "\n";
        }
        result += `[${partialSpeakerId}]: ${partialText}`;
      } else {
        if (result.length > 0) {
          result += " ";
        }
        result += partialText;
      }
    }

    return result;
  }

  /**
   * Wrap and show text on glasses
   */
  private showTranscriptOnGlasses(text: string, isFinal: boolean): void {
    if (!this.appSession) return;

    // Wrap text for display
    const wrapped = this.wrapForDisplay(text);
    const cleaned = this.cleanTranscriptText(wrapped);

    try {
      this.appSession.layouts.showTextWall(cleaned, {
        view: ViewType.MAIN,
        durationMs: isFinal ? 20000 : undefined,
      });
    } catch (err) {
      this.deps.logger.warn(
        "[DisplayManager] Failed to show transcript - connection may be closed",
      );
    }
  }

  /**
   * Wrap text for display, keeping most recent lines
   */
  private wrapForDisplay(text: string): string {
    // Wrap without maxLines constraint
    const result = this.wrapper.wrap(text, {
      maxWidthPx: this.displayWidthPx,
      maxLines: Infinity,
      maxBytes: Infinity,
    });

    // Keep most recent lines (from the end)
    let lines = result.lines;
    if (lines.length > this.maxLines) {
      lines = lines.slice(-this.maxLines);
    }

    return lines.join("\n");
  }

  /**
   * Clean transcript text (remove leading punctuation, preserve speaker labels)
   */
  private cleanTranscriptText(text: string): string {
    return text
      .split("\n")
      .map((line) => {
        // Check if line starts with speaker label [N]:
        const speakerLabelMatch = line.match(/^\[\d+\]:\s*/);
        if (speakerLabelMatch) {
          const label = speakerLabelMatch[0];
          const rest = line.substring(label.length);
          return label + rest.replace(/^[.,;:!?。，；：！？]+/, "").trim();
        }
        return line.replace(/^[.,;:!?。，；：！？]+/, "").trim();
      })
      .join("\n");
  }

  /**
   * Add transcript to history
   */
  private addToHistory(
    text: string,
    speakerId?: string,
    speakerChanged?: boolean,
  ): void {
    this.finalTranscriptHistory.push({
      text,
      speakerId,
      hadSpeakerChange: speakerChanged ?? false,
    });

    // Trim history if needed
    while (this.finalTranscriptHistory.length > MAX_FINAL_TRANSCRIPTS) {
      this.finalTranscriptHistory.shift();
    }
  }

  /**
   * Clear transcript history
   */
  clearTranscriptHistory(): void {
    this.finalTranscriptHistory = [];
    this.partialSpeakerId = undefined;
    this.partialHadSpeakerChange = false;
    this.lastSpeakerId = undefined;
  }

  /**
   * Refresh transcript display with current history
   */
  private refreshTranscriptDisplay(): void {
    if (!this.transcriptEnabled) return;

    const displayText = this.buildDisplayText("", undefined, false);
    if (displayText) {
      this.showTranscriptOnGlasses(displayText, true);
    }
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.deps.logger.info(
        "[DisplayManager] Clearing transcript due to inactivity",
      );
      this.clearTranscriptHistory();

      // Clear glasses display
      if (this.appSession) {
        try {
          this.appSession.layouts.showTextWall("", {
            view: ViewType.MAIN,
            durationMs: 1000,
          });
        } catch {
          // Ignore errors
        }
      }
    }, INACTIVITY_TIMEOUT);
  }

  /**
   * Broadcast display preview to webview
   */
  private broadcastDisplayPreview(
    text: string | string[],
    isFinal: boolean = true,
  ): void {
    if (this.deps.broadcast) {
      // Handle both string and array inputs
      const textStr = Array.isArray(text) ? text.join("\n") : text || "";
      const lines = Array.isArray(text) ? text : (text || "").split("\n");

      this.deps.broadcast.broadcast({
        type: "display_preview",
        text: textStr,
        lines,
        isFinal,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get transcript history
   */
  getTranscriptHistory(): TranscriptHistoryEntry[] {
    return [...this.finalTranscriptHistory];
  }

  // ===========================================================================
  // Legacy showTranscript (for backward compatibility)
  // ===========================================================================

  /**
   * Display transcript text (simple version for backward compatibility)
   * @deprecated Use processAndDisplayTranscript instead
   */
  showTranscript(text: string): void {
    this.processAndDisplayTranscript(text, true, undefined);
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
  showError(message: string) {
    this.showAlert(`❌ ${message}`);
    this.updateDashboard(`❌ Error`);
  }

  // ===========================================================================
  // Dashboard Status (Always-visible status on glasses)
  // ===========================================================================

  /**
   * Update the dashboard with current agent status
   * This is the always-visible status line when you look up
   */
  updateDashboard(status: string): void {
    if (!this.appSession) return;

    try {
      // Use the dashboard API to write persistent status
      if (this.appSession.dashboard?.write) {
        this.appSession.dashboard.write({ text: status });
        this.deps.logger.debug(`[DisplayManager] Dashboard: ${status}`);
      }
    } catch (err) {
      // Dashboard may not be available on all devices
      this.deps.logger.debug(
        "[DisplayManager] Dashboard write failed (may not be supported)",
      );
    }

    // Also broadcast to web UI
    this.broadcastDisplayPreview([status]);
  }

  /**
   * Show agent is idle/monitoring
   */
  showDashboardIdle(): void {
    this.updateDashboard("SEGA • Monitoring");
  }

  /**
   * Show agent is analyzing conversation
   */
  showDashboardAnalyzing(): void {
    this.updateDashboard("SEGA • Analyzing...");
  }

  /**
   * Show agent detected a meeting
   */
  showDashboardMeeting(title?: string): void {
    const display = title ? `📋 ${title}` : "📋 In Meeting";
    this.updateDashboard(display);
  }

  /**
   * Show agent is researching
   */
  showDashboardResearching(query?: string): void {
    const display = query ? `🔍 ${query.slice(0, 20)}...` : "🔍 Researching";
    this.updateDashboard(display);
  }

  /**
   * Show agent is generating notes
   */
  showDashboardGeneratingNotes(): void {
    this.updateDashboard("📝 Generating notes...");
  }

  /**
   * Clear dashboard status
   */
  clearDashboard(): void {
    this.updateDashboard("");
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
      try {
        this.appSession.layouts.showTextWall("");
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Show text directly on the glasses (raw access)
   */
  showTextWall(text: string, durationMs?: number): void {
    if (!this.appSession) return;

    try {
      this.appSession.layouts.showTextWall(text, { durationMs });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Show a reference card (title + body)
   */
  showReferenceCard(title: string, body: string, durationMs?: number): void {
    if (!this.appSession) return;

    try {
      this.appSession.layouts.showReferenceCard(title, body, { durationMs });
    } catch {
      // Ignore errors
    }
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
      try {
        this.appSession.layouts.showTextWall(text);
      } catch {
        // Ignore errors
      }
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
      if (this.currentPriority === priority) {
        this.currentMessage = null;
        this.currentPriority = "low";

        // Return to transcript display if enabled
        if (this.transcriptEnabled) {
          this.refreshTranscriptDisplay();
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

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }

    if (this.deviceStateCleanup) {
      this.deviceStateCleanup();
      this.deviceStateCleanup = null;
    }

    this.deps.logger.info("[DisplayManager] Disposed");
  }
}
