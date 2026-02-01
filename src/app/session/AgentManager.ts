/**
 * AgentManager
 * The "brain" of SEGA - analyzes transcripts and orchestrates actions
 *
 * Responsibilities:
 * - Run analysis loop every 5 seconds (or immediate on "SEGA" trigger)
 * - Detect meeting start/end from transcript context
 * - Classify meetings and match presets
 * - Interpret voice commands (e.g., "SEGA, research...")
 * - Dispatch actions to other managers based on autonomy level
 * - Track session state (idle, detecting, in_meeting, processing, researching)
 */

import type {
  SessionState,
  AnalysisResult,
  MeetingCategory,
  TranscriptSegment,
} from "./types";
import {
  createProviderFromEnv,
  extractText,
  type AgentProvider,
  type UnifiedMessage,
} from "../../services/llm";

/**
 * Interface for the parts of UserSession that AgentManager needs
 */
export interface AgentManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  transcript: {
    getRecentSegments: (
      count?: number,
      finalOnly?: boolean,
    ) => TranscriptSegment[];
    getRecentText: (count?: number, finalOnly?: boolean) => string;
    getTodayFullText: (finalOnly?: boolean) => string;
    getTodaySegmentCount: () => number;
    getCurrentIndex: () => number;
  };
  meeting: {
    isInMeeting: () => boolean;
    getActiveMeeting: () => { title: string; category: MeetingCategory } | null;
    startMeeting: (options: {
      title: string;
      category: MeetingCategory;
      confidence: number;
      attendees?: string[];
      presetId?: string;
      isSensitive?: boolean;
      sensitiveReason?: string;
    }) => Promise<any>;
    endMeeting: () => Promise<any>;
    addTopics: (topics: string[]) => Promise<void>;
    addAttendees: (attendees: string[]) => Promise<void>;
    markAsSensitive: (reason: string) => Promise<void>;
  };
  settings: {
    getPresets: () => Array<{
      _id?: string;
      name: string;
      category: MeetingCategory;
      condition: string;
      sensitive?: boolean;
      sensitiveReason?: string;
    }>;
    findMatchingPreset: (context: string) =>
      | {
          _id?: string;
          name: string;
          category: MeetingCategory;
          sensitive?: boolean;
          sensitiveReason?: string;
        }
      | undefined;
    getSensitiveKeywords: () => string[];
    checkForSensitiveContent: (
      text: string,
    ) => { action: "pause" | "flag" } | null;
    getAutonomyLevel: () => "capture_only" | "suggest" | "act";
  };
  broadcast: {
    sendStateChange: (previousState: string, newState: string) => void;
    broadcast: (data: Record<string, unknown>) => void;
  };
  display: {
    showMessage: (
      text: string,
      options?: { duration?: number; priority?: string },
    ) => void;
    showProcessing: () => void;
    showNotification: (text: string) => void;
    // Dashboard status methods
    showDashboardIdle: () => void;
    showDashboardAnalyzing: () => void;
    showDashboardMeeting: (title?: string) => void;
    showDashboardResearching: (query?: string) => void;
    showDashboardGeneratingNotes: () => void;
    updateDashboard: (status: string) => void;
  };
  // Notes manager will be added when we create it
  notes?: {
    generateNotes: (meetingId: string) => Promise<void>;
  };
  // Research manager will be added when we create it
  research?: {
    startResearch: (query: string, type: string) => Promise<void>;
  };
}

/** Analysis loop interval in milliseconds */
const ANALYSIS_INTERVAL = 5000; // 5 seconds

/** Minimum transcript length before running analysis */
const MIN_TRANSCRIPT_LENGTH = 50;

/** Feature flag: Enable sensitive topic detection (disabled for demo) */
const ENABLE_SENSITIVE_TOPIC_DETECTION = false;

/** Keywords that trigger immediate analysis */
const TRIGGER_KEYWORDS = [
  "sega",
  "hey sega",
  "ok sega",
  "okay sega",
  "seka",
  "hey seka",
  "ok seka",
  "okay seka",
];

/** Meeting detection prompt */
const MEETING_DETECTION_PROMPT = `You are an AI assistant analyzing a conversation transcript to detect if a meeting/conversation has started or ended.

Current State: {{STATE}}
{{MEETING_INFO}}

Recent Transcript:
"""
{{TRANSCRIPT}}
"""

Available Meeting Categories:
- investor_update: Meetings with investors, VCs, board members about company progress
- board_meeting: Board of directors or advisory board sessions
- one_on_one: One-on-one meetings with colleagues, reports, or managers
- team_standup: Daily standups, sprint planning, team sync meetings
- client_call: Meetings with clients or customers
- interview: Job interviews or candidate screenings
- networking: Networking events, conferences, casual professional meetings
- personal: Personal conversations
- unknown: Cannot determine the type

Sensitive Keywords to Watch For:
{{SENSITIVE_KEYWORDS}}

Analyze the transcript and respond with ONLY a JSON object (no markdown, no explanation):
{
  "meetingDetected": boolean,      // true if a meeting/conversation seems to be starting
  "meetingEnded": boolean,         // true if the meeting seems to be ending
  "classification": {              // only if meetingDetected is true
    "category": string,            // one of the categories above
    "confidence": number,          // 0.0 to 1.0
    "title": string,               // suggested meeting title
    "attendees": string[]          // detected attendee names
  },
  "sensitiveDetected": boolean,    // true if sensitive content detected
  "sensitiveReason": string,       // reason if sensitive
  "topics": string[],              // key topics mentioned
  "commands": []                   // detected voice commands (see below)
}

For commands, look for phrases like "SEGA, research X", "SEGA, take note of X", "SEGA, end meeting", or "SEGA, generate notes":
{
  "type": "research" | "note" | "email" | "remind" | "end_meeting" | "generate_notes",
  "content": string
}

IMPORTANT: If someone says "SEGA, end meeting" or "SEGA, end the meeting" or "SEGA, wrap up", detect it as:
{ "type": "end_meeting", "content": "" }

If someone says "SEGA, generate notes" or "SEGA, create notes" or "SEGA, make notes", detect it as:
{ "type": "generate_notes", "content": "" }`;

/**
 * AgentManager - the brain that orchestrates SEGA
 */
export class AgentManager {
  /** Reference to parent session dependencies */
  private readonly deps: AgentManagerDeps;

  /** Current session state */
  private state: SessionState = "idle";

  /** Analysis loop timer */
  private analysisTimer?: ReturnType<typeof setInterval>;

  /** Whether there are new transcripts since last analysis */
  private hasNewTranscripts: boolean = false;

  /** Last analyzed transcript index */
  private lastAnalyzedIndex: number = 0;

  /** LLM provider for analysis */
  private provider: AgentProvider | null = null;

  /** Whether agent is paused (e.g., sensitive content) */
  private isPaused: boolean = false;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  /** Pending commands to process */
  private pendingCommands: Array<{ type: string; content: string }> = [];

  constructor(deps: AgentManagerDeps) {
    this.deps = deps;

    // Try to initialize LLM provider
    try {
      this.provider = createProviderFromEnv();
      this.deps.logger.info("[AgentManager] LLM provider initialized");
    } catch (error) {
      this.deps.logger.warn(
        "[AgentManager] No LLM provider available - analysis disabled",
        error,
      );
    }

    this.deps.logger.info("[AgentManager] Initialized");
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Get current session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Set session state and broadcast change
   */
  private setState(newState: SessionState): void {
    if (newState === this.state) return;

    const previousState = this.state;
    this.state = newState;

    this.deps.broadcast.sendStateChange(previousState, newState);
    this.deps.logger.info(
      `[AgentManager] State changed: ${previousState} -> ${newState}`,
    );

    // Update dashboard status based on state
    this.updateDashboardForState(newState);
  }

  /**
   * Update dashboard display based on current state
   */
  private updateDashboardForState(state: SessionState): void {
    switch (state) {
      case "idle":
        this.deps.display.showDashboardIdle();
        break;
      case "detecting":
        this.deps.display.updateDashboard("SEGA • Detecting...");
        break;
      case "in_meeting":
        const meeting = this.deps.meeting.getActiveMeeting();
        this.deps.display.showDashboardMeeting(meeting?.title);
        break;
      case "processing":
        this.deps.display.showDashboardGeneratingNotes();
        break;
      case "researching":
        this.deps.display.showDashboardResearching();
        break;
      default:
        this.deps.display.showDashboardIdle();
    }
  }

  /**
   * Check if agent is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Pause the agent (e.g., for sensitive content)
   */
  pause(reason?: string): void {
    this.isPaused = true;
    this.deps.logger.info(
      `[AgentManager] Paused${reason ? `: ${reason}` : ""}`,
    );
  }

  /**
   * Resume the agent
   */
  resume(): void {
    this.isPaused = false;
    this.deps.logger.info("[AgentManager] Resumed");
  }

  // ===========================================================================
  // Analysis Loop
  // ===========================================================================

  /**
   * Start the analysis loop
   */
  start(): void {
    if (this.analysisTimer) return;

    this.deps.logger.info("[AgentManager] Starting analysis loop");

    // Show initial dashboard status
    this.deps.display.showDashboardIdle();

    this.analysisTimer = setInterval(() => {
      this.runAnalysisIfNeeded().catch((err) => {
        this.deps.logger.error("[AgentManager] Analysis error:", err);
      });
    }, ANALYSIS_INTERVAL);
  }

  /**
   * Stop the analysis loop
   */
  stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
      this.deps.logger.info("[AgentManager] Analysis loop stopped");
    }
  }

  /**
   * Notify that new transcript is available
   */
  onNewTranscript(segment: TranscriptSegment): void {
    if (!segment.isFinal) return;

    this.hasNewTranscripts = true;

    // Check for direct voice commands (faster than waiting for LLM)
    const directCommand = this.checkForDirectCommand(segment.text);
    if (directCommand) {
      this.deps.logger.info(
        `[AgentManager] Direct command detected: ${directCommand.type}`,
      );
      this.handleCommand(
        directCommand,
        this.deps.settings.getAutonomyLevel(),
      ).catch((err) => {
        this.deps.logger.error("[AgentManager] Direct command error:", err);
      });
      return; // Skip regular analysis for direct commands
    }

    // Check for immediate trigger keywords
    if (this.shouldTriggerImmediately(segment.text)) {
      this.deps.logger.info(
        "[AgentManager] Trigger keyword detected - running immediate analysis",
      );
      this.runAnalysis().catch((err) => {
        this.deps.logger.error("[AgentManager] Immediate analysis error:", err);
      });
    }

    // Check for sensitive content (disabled for demo via feature flag)
    if (ENABLE_SENSITIVE_TOPIC_DETECTION) {
      const sensitiveCheck = this.deps.settings.checkForSensitiveContent(
        segment.text,
      );
      if (sensitiveCheck) {
        this.handleSensitiveContent(segment.text, sensitiveCheck.action);
      }
    }
  }

  /**
   * Run analysis if there are new transcripts
   */
  private async runAnalysisIfNeeded(): Promise<void> {
    if (!this.hasNewTranscripts) return;
    if (this.isPaused) return;
    if (!this.provider) return;

    await this.runAnalysis();
  }

  /**
   * Run transcript analysis
   */
  private async runAnalysis(): Promise<void> {
    if (!this.provider) return;
    if (this.state === "processing" || this.state === "researching") return;

    const recentText = this.deps.transcript.getRecentText(50, true);
    if (recentText.length < MIN_TRANSCRIPT_LENGTH) return;

    this.hasNewTranscripts = false;
    const currentIndex = this.deps.transcript.getCurrentIndex();

    // Don't re-analyze same content
    if (currentIndex <= this.lastAnalyzedIndex) return;
    this.lastAnalyzedIndex = currentIndex;

    try {
      const result = await this.analyzeTranscript(recentText);
      await this.processAnalysisResult(result);
    } catch (error) {
      this.deps.logger.error("[AgentManager] Analysis failed:", error);
    }
  }

  /**
   * Check if text contains trigger keywords
   */
  private shouldTriggerImmediately(text: string): boolean {
    const lower = text.toLowerCase();
    return TRIGGER_KEYWORDS.some((keyword) => lower.includes(keyword));
  }

  /**
   * Check for direct voice commands that don't need LLM analysis
   * These are faster and more reliable for common actions
   */
  private checkForDirectCommand(
    text: string,
  ): { type: string; content: string } | null {
    const lower = text.toLowerCase();

    // Must contain "sega" or "seka" (common misheard) to be a command
    if (!lower.includes("sega") && !lower.includes("seka")) return null;

    // End meeting commands
    if (
      lower.includes("end meeting") ||
      lower.includes("end the meeting") ||
      lower.includes("wrap up") ||
      lower.includes("finish meeting") ||
      lower.includes("stop meeting")
    ) {
      return { type: "end_meeting", content: "" };
    }

    // Generate notes commands
    if (
      lower.includes("generate notes") ||
      lower.includes("create notes") ||
      lower.includes("make notes") ||
      lower.includes("write notes") ||
      lower.includes("take notes")
    ) {
      return { type: "generate_notes", content: "" };
    }

    // Research commands - extract the query
    const researchMatch = lower.match(
      /(?:sega|seka)[,.]?\s*(?:research|look up|find|search)\s+(.+)/i,
    );
    if (researchMatch) {
      return { type: "research", content: researchMatch[1].trim() };
    }

    return null;
  }

  // ===========================================================================
  // LLM Analysis
  // ===========================================================================

  /**
   * Analyze transcript with LLM
   */
  private async analyzeTranscript(transcript: string): Promise<AnalysisResult> {
    if (!this.provider) {
      return this.getEmptyAnalysisResult();
    }

    // Build prompt
    const meetingInfo = this.deps.meeting.isInMeeting()
      ? `Currently in meeting: "${this.deps.meeting.getActiveMeeting()?.title}" (${this.deps.meeting.getActiveMeeting()?.category})`
      : "Not currently in a meeting";

    const sensitiveKeywords = this.deps.settings
      .getSensitiveKeywords()
      .slice(0, 20);

    const prompt = MEETING_DETECTION_PROMPT.replace("{{STATE}}", this.state)
      .replace("{{MEETING_INFO}}", meetingInfo)
      .replace("{{TRANSCRIPT}}", transcript)
      .replace(
        "{{SENSITIVE_KEYWORDS}}",
        sensitiveKeywords.join(", ") || "none configured",
      );

    const messages: UnifiedMessage[] = [{ role: "user", content: prompt }];

    try {
      const response = await this.provider.chat(messages, {
        tier: "smart",
        maxTokens: 1024,
        temperature: 0.3,
      });

      const text = extractText(response);
      return this.parseAnalysisResponse(text);
    } catch (error) {
      this.deps.logger.error("[AgentManager] LLM analysis error:", error);
      return this.getEmptyAnalysisResult();
    }
  }

  /**
   * Parse LLM analysis response
   */
  private parseAnalysisResponse(text: string): AnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.deps.logger.warn("[AgentManager] No JSON found in response");
        return this.getEmptyAnalysisResult();
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        meetingDetected: !!parsed.meetingDetected,
        meetingEnded: !!parsed.meetingEnded,
        classification: parsed.classification
          ? {
              category: parsed.classification.category || "unknown",
              confidence: parsed.classification.confidence || 0.5,
              title: parsed.classification.title || "Untitled Meeting",
              attendees: parsed.classification.attendees || [],
            }
          : undefined,
        sensitiveDetected: !!parsed.sensitiveDetected,
        sensitiveReason: parsed.sensitiveReason,
        matchedPresetId: undefined, // Will be set later
        topics: parsed.topics || [],
        commands: parsed.commands || [],
      };
    } catch (error) {
      this.deps.logger.error(
        "[AgentManager] Failed to parse analysis response:",
        error,
      );
      return this.getEmptyAnalysisResult();
    }
  }

  /**
   * Get empty analysis result
   */
  private getEmptyAnalysisResult(): AnalysisResult {
    return {
      meetingDetected: false,
      meetingEnded: false,
      sensitiveDetected: false,
      topics: [],
      commands: [],
    };
  }

  // ===========================================================================
  // Result Processing
  // ===========================================================================

  /**
   * Process analysis result and take appropriate actions
   */
  private async processAnalysisResult(result: AnalysisResult): Promise<void> {
    const autonomyLevel = this.deps.settings.getAutonomyLevel();

    // Handle sensitive content (disabled for demo via feature flag)
    if (ENABLE_SENSITIVE_TOPIC_DETECTION && result.sensitiveDetected) {
      await this.handleSensitiveFromAnalysis(result);
    }

    // Handle meeting detection
    if (result.meetingDetected && !this.deps.meeting.isInMeeting()) {
      await this.handleMeetingDetected(result, autonomyLevel);
    }

    // Handle meeting end
    if (result.meetingEnded && this.deps.meeting.isInMeeting()) {
      await this.handleMeetingEnded(autonomyLevel);
    }

    // Handle topics (if in meeting)
    if (result.topics.length > 0 && this.deps.meeting.isInMeeting()) {
      await this.deps.meeting.addTopics(result.topics);
    }

    // Handle commands
    for (const command of result.commands) {
      await this.handleCommand(command, autonomyLevel);
    }
  }

  /**
   * Handle meeting detection - always auto-start meetings
   */
  private async handleMeetingDetected(
    result: AnalysisResult,
    _autonomyLevel: string,
  ): Promise<void> {
    if (!result.classification) return;

    this.setState("detecting");

    // Try to find matching preset
    const transcript = this.deps.transcript.getRecentText(20, true);
    const matchedPreset = this.deps.settings.findMatchingPreset(transcript);

    // Broadcast that we're starting a meeting
    this.deps.broadcast.broadcast({
      type: "agent_activity",
      activity: "meeting_detection",
      message: `Detected meeting: ${result.classification.title}`,
      data: {
        classification: result.classification,
        preset: matchedPreset?.name,
      },
    });

    // Always auto-start meetings (no confirmation needed)
    this.deps.display.showMessage(
      `🎯 Meeting started\n${result.classification.title}`,
      { duration: 3000 },
    );

    await this.deps.meeting.startMeeting({
      title: result.classification.title,
      category: result.classification.category as MeetingCategory,
      confidence: result.classification.confidence,
      attendees: result.classification.attendees,
      presetId: matchedPreset?._id,
      isSensitive: matchedPreset?.sensitive || result.sensitiveDetected,
      sensitiveReason: matchedPreset?.sensitiveReason || result.sensitiveReason,
    });

    this.setState("in_meeting");
  }

  /**
   * Handle meeting end
   */
  private async handleMeetingEnded(autonomyLevel: string): Promise<void> {
    this.setState("processing");

    const meeting = await this.deps.meeting.endMeeting();

    if (meeting && this.deps.notes && autonomyLevel !== "capture_only") {
      // Generate notes
      this.deps.display.showProcessing();
      try {
        await this.deps.notes.generateNotes(meeting._id);
      } catch (error) {
        this.deps.logger.error("[AgentManager] Note generation failed:", error);
      }
    }

    this.setState("idle");
  }

  /**
   * Handle sensitive content from analysis
   */
  private async handleSensitiveFromAnalysis(
    result: AnalysisResult,
  ): Promise<void> {
    if (this.deps.meeting.isInMeeting()) {
      await this.deps.meeting.markAsSensitive(
        result.sensitiveReason || "Sensitive content detected",
      );
    }

    this.deps.display.showNotification("⚠️ Sensitive content detected");
    this.deps.broadcast.broadcast({
      type: "sensitive_detected",
      reason: result.sensitiveReason,
    });
  }

  /**
   * Handle sensitive content detection
   */
  private handleSensitiveContent(text: string, action: "pause" | "flag"): void {
    if (action === "pause") {
      this.pause("Sensitive content detected");
      this.deps.display.showMessage("⏸️ Capture paused\n(sensitive content)", {
        duration: 3000,
      });
    } else {
      // Just flag it
      if (this.deps.meeting.isInMeeting()) {
        this.deps.meeting.markAsSensitive("Sensitive keywords detected");
      }
    }
  }

  /**
   * Handle voice command
   */
  private async handleCommand(
    command: { type: string; content: string },
    autonomyLevel: string,
  ): Promise<void> {
    this.deps.logger.info(
      `[AgentManager] Processing command: ${command.type} - "${command.content}"`,
    );

    if (autonomyLevel === "capture_only") {
      // Store command but don't execute
      this.pendingCommands.push(command);
      return;
    }

    switch (command.type) {
      case "research":
        if (this.deps.research) {
          this.setState("researching");
          this.deps.display.showMessage(`🔍 Researching:\n${command.content}`, {
            duration: 5000,
          });
          try {
            await this.deps.research.startResearch(command.content, "general");
          } catch (error) {
            this.deps.logger.error("[AgentManager] Research failed:", error);
          }
          this.setState(
            this.deps.meeting.isInMeeting() ? "in_meeting" : "idle",
          );
        }
        break;

      case "note":
        this.deps.display.showNotification(`📝 Noted: ${command.content}`);
        this.deps.broadcast.broadcast({
          type: "quick_note",
          content: command.content,
        });
        break;

      case "email":
        this.deps.display.showNotification(`📧 Email queued`);
        this.pendingCommands.push(command);
        break;

      case "remind":
        this.deps.display.showNotification(`⏰ Reminder set`);
        this.pendingCommands.push(command);
        break;

      case "end_meeting":
      case "generate_notes":
        await this.handleGenerateNotesCommand(autonomyLevel);
        break;

      default:
        this.deps.logger.warn(
          `[AgentManager] Unknown command type: ${command.type}`,
        );
    }
  }

  /**
   * Handle generate notes command - works with or without active meeting
   * If no active meeting, creates one from recent transcripts
   */
  private async handleGenerateNotesCommand(
    autonomyLevel: string,
  ): Promise<void> {
    this.deps.display.showMessage(`📝 Analyzing transcripts...`, {
      duration: 3000,
    });

    // If there's an active meeting, end it and generate notes
    if (this.deps.meeting.isInMeeting()) {
      this.deps.logger.info(
        "[AgentManager] Ending active meeting and generating notes",
      );
      await this.handleMeetingEnded(autonomyLevel);
      return;
    }

    // No active meeting - create one from ALL of today's transcripts
    this.deps.logger.info(
      "[AgentManager] No active meeting - creating from today's full transcript",
    );

    // Get ALL transcript text for today
    const recentText = this.deps.transcript.getTodayFullText(true);
    const segmentCount = this.deps.transcript.getTodaySegmentCount();
    this.deps.logger.info(
      `[AgentManager] Found ${segmentCount} segments for today`,
    );

    if (!recentText || recentText.length < 50) {
      this.deps.display.showMessage(
        `Not enough transcript\nto generate notes`,
        {
          duration: 3000,
        },
      );
      return;
    }

    this.setState("processing");

    try {
      // Analyze transcript to get meeting classification
      let classification = {
        category: "unknown" as MeetingCategory,
        title: "Meeting Notes",
        confidence: 0.8,
        attendees: [] as string[],
      };

      // Try to get better classification from LLM
      if (this.provider) {
        try {
          const analysisResult = await this.analyzeTranscript(recentText);
          if (analysisResult.classification) {
            classification = {
              category: analysisResult.classification
                .category as MeetingCategory,
              title: analysisResult.classification.title,
              confidence: analysisResult.classification.confidence,
              attendees: analysisResult.classification.attendees,
            };
          }
        } catch (err) {
          this.deps.logger.warn(
            "[AgentManager] Classification failed, using defaults",
          );
        }
      }

      this.deps.display.showMessage(
        `📋 ${classification.title}\nGenerating notes...`,
        {
          duration: 3000,
        },
      );

      // Create a meeting record for the transcript
      await this.deps.meeting.startMeeting({
        title: classification.title,
        category: classification.category,
        confidence: classification.confidence,
        attendees: classification.attendees,
      });

      // Immediately end it to trigger note generation
      const meeting = await this.deps.meeting.endMeeting();

      if (meeting && this.deps.notes && autonomyLevel !== "capture_only") {
        this.deps.display.showDashboardGeneratingNotes();
        try {
          await this.deps.notes.generateNotes(meeting._id!);
          this.deps.display.showMessage(`✅ Notes created!\nCheck your inbox`, {
            duration: 4000,
          });
        } catch (error) {
          this.deps.logger.error(
            "[AgentManager] Note generation failed:",
            error,
          );
          this.deps.display.showMessage(`❌ Note generation\nfailed`, {
            duration: 3000,
          });
        }
      }
    } catch (error) {
      this.deps.logger.error(
        "[AgentManager] Generate notes command failed:",
        error,
      );
      this.deps.display.showMessage(`❌ Failed to\ngenerate notes`, {
        duration: 3000,
      });
    }

    this.setState("idle");
  }

  // ===========================================================================
  // Manual Actions
  // ===========================================================================

  /**
   * Manually start a meeting
   */
  async manualStartMeeting(
    title: string,
    category: MeetingCategory,
  ): Promise<void> {
    const preset = this.deps.settings.findMatchingPreset(title);

    await this.deps.meeting.startMeeting({
      title,
      category,
      confidence: 1.0,
      presetId: preset?._id,
      isSensitive: preset?.sensitive,
      sensitiveReason: preset?.sensitiveReason,
    });

    this.setState("in_meeting");
  }

  /**
   * Manually end the current meeting
   */
  async manualEndMeeting(): Promise<void> {
    if (!this.deps.meeting.isInMeeting()) return;

    await this.handleMeetingEnded(this.deps.settings.getAutonomyLevel());
  }

  /**
   * Confirm a pending action
   */
  async confirmPendingAction(): Promise<void> {
    const pending = this.pendingCommands.shift();
    if (!pending) return;

    if (pending.type === "start_meeting") {
      const classification = JSON.parse(pending.content);
      await this.deps.meeting.startMeeting({
        title: classification.title,
        category: classification.category,
        confidence: classification.confidence,
        attendees: classification.attendees,
      });
      this.setState("in_meeting");
    } else {
      await this.handleCommand(pending, "act");
    }
  }

  /**
   * Dismiss pending actions
   */
  dismissPendingActions(): void {
    this.pendingCommands = [];
  }

  /**
   * Get pending commands
   */
  getPendingCommands(): Array<{ type: string; content: string }> {
    return [...this.pendingCommands];
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

    this.stop();
    this.pendingCommands = [];

    this.deps.logger.info("[AgentManager] Disposed");
  }
}
