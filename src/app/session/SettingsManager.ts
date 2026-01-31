/**
 * SettingsManager
 * Manages user settings, meeting presets, and sensitive topics
 *
 * Responsibilities:
 * - Load and persist user settings
 * - Manage meeting presets (system and custom)
 * - Track sensitive topics for privacy protection
 * - Provide settings to other managers
 */

import type {
  UserSettings,
  MeetingPreset,
  SensitiveTopic,
  AutonomyLevel,
  MeetingCategory,
  NoteDetailLevel,
} from "./types";

/**
 * Interface for the parts of UserSession that SettingsManager needs
 * This avoids circular dependency issues
 */
export interface SettingsManagerDeps {
  userId: string;
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  display: {
    enableTranscript: () => void;
    disableTranscript: () => void;
  };
}

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: Omit<
  UserSettings,
  "userId" | "createdAt" | "updatedAt"
> = {
  autonomyLevel: "suggest",
  showLiveTranscript: true,
};

/**
 * System presets that come pre-configured
 */
const SYSTEM_PRESETS: Omit<MeetingPreset, "_id" | "createdAt" | "updatedAt">[] =
  [
    {
      name: "Investor Update",
      condition:
        "Meeting with investors, VCs, or board members about company progress",
      category: "investor_update",
      userContext: "I am presenting company metrics and progress to investors",
      noteRules: {
        detailLevel: "detailed",
        captureDecisions: true,
        captureActionItems: true,
        customInstructions:
          "Focus on commitments made, questions asked, and follow-up items",
      },
      researchTriggers: {
        autoResearchAttendees: true,
        autoResearchCompanies: true,
        autoResearchTopics: false,
      },
      isSystem: true,
      order: 1,
    },
    {
      name: "Board Meeting",
      condition: "Board of directors meeting or advisory board session",
      category: "board_meeting",
      userContext: "I am in a formal board meeting with directors",
      noteRules: {
        detailLevel: "detailed",
        captureDecisions: true,
        captureActionItems: true,
        customInstructions:
          "Capture all votes, resolutions, and strategic decisions",
      },
      researchTriggers: {
        autoResearchAttendees: true,
        autoResearchCompanies: false,
        autoResearchTopics: false,
      },
      sensitive: true,
      sensitiveReason: "Board discussions may contain confidential information",
      isSystem: true,
      order: 2,
    },
    {
      name: "1:1 Meeting",
      condition:
        "One-on-one meeting with a direct report, manager, or colleague",
      category: "one_on_one",
      userContext: "I am having a private conversation with one person",
      noteRules: {
        detailLevel: "standard",
        captureDecisions: true,
        captureActionItems: true,
        customInstructions:
          "Focus on action items, feedback given/received, and commitments",
      },
      researchTriggers: {
        autoResearchAttendees: false,
        autoResearchCompanies: false,
        autoResearchTopics: false,
      },
      isSystem: true,
      order: 3,
    },
    {
      name: "Team Standup",
      condition: "Daily standup, sprint planning, or team sync meeting",
      category: "team_standup",
      userContext: "I am in a team coordination meeting",
      noteRules: {
        detailLevel: "brief",
        captureDecisions: false,
        captureActionItems: true,
        customInstructions: "Focus on blockers and action items only",
      },
      researchTriggers: {
        autoResearchAttendees: false,
        autoResearchCompanies: false,
        autoResearchTopics: false,
      },
      isSystem: true,
      order: 4,
    },
    {
      name: "Client Call",
      condition: "Meeting with a client, customer, or potential customer",
      category: "client_call",
      userContext: "I am meeting with a client or customer",
      noteRules: {
        detailLevel: "detailed",
        captureDecisions: true,
        captureActionItems: true,
        customInstructions:
          "Capture client needs, concerns, commitments, and next steps",
      },
      researchTriggers: {
        autoResearchAttendees: true,
        autoResearchCompanies: true,
        autoResearchTopics: false,
      },
      isSystem: true,
      order: 5,
    },
    {
      name: "Interview",
      condition: "Job interview, candidate screening, or hiring discussion",
      category: "interview",
      userContext: "I am conducting or participating in an interview",
      noteRules: {
        detailLevel: "detailed",
        captureDecisions: false,
        captureActionItems: true,
        customInstructions:
          "Focus on candidate responses, key qualifications, and evaluation notes",
      },
      researchTriggers: {
        autoResearchAttendees: true,
        autoResearchCompanies: true,
        autoResearchTopics: false,
      },
      sensitive: true,
      sensitiveReason: "Interview discussions contain personal information",
      isSystem: true,
      order: 6,
    },
    {
      name: "Networking",
      condition: "Networking event, conference, or casual professional meeting",
      category: "networking",
      userContext:
        "I am at a networking event or informal professional gathering",
      noteRules: {
        detailLevel: "brief",
        captureDecisions: false,
        captureActionItems: true,
        customInstructions:
          "Capture contact info, interesting facts, and follow-up opportunities",
      },
      researchTriggers: {
        autoResearchAttendees: true,
        autoResearchCompanies: true,
        autoResearchTopics: true,
      },
      isSystem: true,
      order: 7,
    },
  ];

/**
 * Default sensitive topics
 */
const DEFAULT_SENSITIVE_TOPICS: Omit<SensitiveTopic, "_id" | "createdAt">[] = [
  {
    userId: "", // Will be set when loaded
    keywords: ["salary", "compensation", "equity", "stock options", "bonus"],
    action: "flag",
    enabled: true,
  },
  {
    userId: "",
    keywords: ["layoff", "termination", "fired", "let go", "severance"],
    action: "flag",
    enabled: true,
  },
  {
    userId: "",
    keywords: ["medical", "health condition", "diagnosis", "treatment"],
    action: "pause",
    enabled: true,
  },
  {
    userId: "",
    keywords: ["lawsuit", "legal action", "litigation", "settlement"],
    action: "flag",
    enabled: true,
  },
];

/**
 * SettingsManager - manages user settings, presets, and sensitive topics
 */
export class SettingsManager {
  /** Reference to parent session dependencies */
  private readonly deps: SettingsManagerDeps;

  /** User settings (loaded from DB or defaults) */
  private settings: UserSettings;

  /** Meeting presets (system + user custom) */
  private presets: MeetingPreset[] = [];

  /** Sensitive topics */
  private sensitiveTopics: SensitiveTopic[] = [];

  /** Whether settings have been loaded from database */
  private isLoaded: boolean = false;

  /** Whether the manager has been disposed */
  private disposed: boolean = false;

  constructor(deps: SettingsManagerDeps) {
    this.deps = deps;

    // Initialize with defaults
    const now = new Date();
    this.settings = {
      ...DEFAULT_SETTINGS,
      userId: deps.userId,
      createdAt: now,
      updatedAt: now,
    };

    this.deps.logger.info("[SettingsManager] Initialized");
  }

  /**
   * Load settings from database
   * Should be called after construction
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;

    this.deps.logger.info("[SettingsManager] Loading settings...");

    try {
      // TODO: Load from MongoDB
      // const db = await getDatabase();
      // const settings = await db.collection('user_settings').findOne({ userId: this.userSession.userId });
      // const presets = await db.collection('meeting_presets').find({ $or: [{ userId: this.userSession.userId }, { isSystem: true }] }).toArray();
      // const sensitiveTopics = await db.collection('sensitive_topics').find({ userId: this.userSession.userId }).toArray();

      // For now, use defaults
      this.loadSystemPresets();
      this.loadDefaultSensitiveTopics();

      this.isLoaded = true;
      this.deps.logger.info("[SettingsManager] Settings loaded");
    } catch (error) {
      this.deps.logger.error(
        "[SettingsManager] Failed to load settings:",
        error,
      );
      // Continue with defaults
      this.loadSystemPresets();
      this.loadDefaultSensitiveTopics();
      this.isLoaded = true;
    }
  }

  // ===========================================================================
  // User Settings
  // ===========================================================================

  /**
   * Get current user settings
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * Update user settings
   */
  async updateSettings(
    updates: Partial<Omit<UserSettings, "userId" | "createdAt">>,
  ): Promise<void> {
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date(),
    };

    // TODO: Persist to MongoDB
    // const db = await getDatabase();
    // await db.collection('user_settings').updateOne(
    //   { userId: this.deps.userId },
    //   { $set: this.settings },
    //   { upsert: true }
    // );

    this.deps.logger.info("[SettingsManager] Settings updated");
  }

  /**
   * Get autonomy level
   */
  getAutonomyLevel(): AutonomyLevel {
    return this.settings.autonomyLevel;
  }

  /**
   * Set autonomy level
   */
  async setAutonomyLevel(level: AutonomyLevel): Promise<void> {
    await this.updateSettings({ autonomyLevel: level });
  }

  /**
   * Check if live transcript is enabled
   */
  isLiveTranscriptEnabled(): boolean {
    return this.settings.showLiveTranscript;
  }

  /**
   * Toggle live transcript display
   */
  async toggleLiveTranscript(enabled: boolean): Promise<void> {
    await this.updateSettings({ showLiveTranscript: enabled });

    // Update display manager
    if (enabled) {
      this.deps.display.enableTranscript();
    } else {
      this.deps.display.disableTranscript();
    }
  }

  // ===========================================================================
  // Meeting Presets
  // ===========================================================================

  /**
   * Get all presets (system + user)
   */
  getPresets(): MeetingPreset[] {
    return [...this.presets].sort(
      (a, b) => (a.order || 999) - (b.order || 999),
    );
  }

  /**
   * Get system presets only
   */
  getSystemPresets(): MeetingPreset[] {
    return this.presets.filter((p) => p.isSystem);
  }

  /**
   * Get user custom presets only
   */
  getUserPresets(): MeetingPreset[] {
    return this.presets.filter((p) => !p.isSystem);
  }

  /**
   * Get a preset by ID
   */
  getPreset(presetId: string): MeetingPreset | undefined {
    return this.presets.find((p) => p._id === presetId);
  }

  /**
   * Get preset for a category
   */
  getPresetForCategory(category: MeetingCategory): MeetingPreset | undefined {
    return this.presets.find((p) => p.category === category);
  }

  /**
   * Find matching preset based on meeting context
   * @param context Natural language description of the meeting
   * @returns Best matching preset or undefined
   */
  findMatchingPreset(context: string): MeetingPreset | undefined {
    const contextLower = context.toLowerCase();

    // Simple keyword matching for now
    // TODO: Use LLM for smarter matching
    for (const preset of this.getPresets()) {
      const conditionLower = preset.condition.toLowerCase();
      const nameLower = preset.name.toLowerCase();

      // Check if any significant words match
      const conditionWords = conditionLower
        .split(/\s+/)
        .filter((w) => w.length > 3);
      for (const word of conditionWords) {
        if (contextLower.includes(word)) {
          return preset;
        }
      }

      // Check name match
      if (contextLower.includes(nameLower)) {
        return preset;
      }
    }

    return undefined;
  }

  /**
   * Add a custom preset
   */
  async addPreset(
    preset: Omit<MeetingPreset, "_id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<MeetingPreset> {
    const now = new Date();
    const newPreset: MeetingPreset = {
      ...preset,
      _id: `preset_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: this.deps.userId,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };

    this.presets.push(newPreset);

    // TODO: Persist to MongoDB
    // const db = await getDatabase();
    // await db.collection('meeting_presets').insertOne(newPreset);

    this.deps.logger.info(`[SettingsManager] Added preset: ${newPreset.name}`);
    return newPreset;
  }

  /**
   * Update a custom preset
   */
  async updatePreset(
    presetId: string,
    updates: Partial<
      Omit<MeetingPreset, "_id" | "userId" | "isSystem" | "createdAt">
    >,
  ): Promise<void> {
    const index = this.presets.findIndex((p) => p._id === presetId);
    if (index === -1) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    const preset = this.presets[index];
    if (preset.isSystem) {
      throw new Error("Cannot modify system presets");
    }

    this.presets[index] = {
      ...preset,
      ...updates,
      updatedAt: new Date(),
    };

    // TODO: Persist to MongoDB

    this.deps.logger.info(`[SettingsManager] Updated preset: ${preset.name}`);
  }

  /**
   * Delete a custom preset
   */
  async deletePreset(presetId: string): Promise<void> {
    const index = this.presets.findIndex((p) => p._id === presetId);
    if (index === -1) {
      throw new Error(`Preset not found: ${presetId}`);
    }

    const preset = this.presets[index];
    if (preset.isSystem) {
      throw new Error("Cannot delete system presets");
    }

    this.presets.splice(index, 1);

    // TODO: Delete from MongoDB

    this.deps.logger.info(`[SettingsManager] Deleted preset: ${preset.name}`);
  }

  // ===========================================================================
  // Sensitive Topics
  // ===========================================================================

  /**
   * Get all sensitive topics
   */
  getSensitiveTopics(): SensitiveTopic[] {
    return [...this.sensitiveTopics];
  }

  /**
   * Get enabled sensitive topics
   */
  getEnabledSensitiveTopics(): SensitiveTopic[] {
    return this.sensitiveTopics.filter((t) => t.enabled);
  }

  /**
   * Get all sensitive keywords (flattened list)
   */
  getSensitiveKeywords(): string[] {
    return this.getEnabledSensitiveTopics().flatMap((t) => t.keywords);
  }

  /**
   * Check if text contains sensitive content
   * @returns The matched topic or null
   */
  checkForSensitiveContent(text: string): SensitiveTopic | null {
    const textLower = text.toLowerCase();

    for (const topic of this.getEnabledSensitiveTopics()) {
      for (const keyword of topic.keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          return topic;
        }
      }
    }

    return null;
  }

  /**
   * Add a sensitive topic
   */
  async addSensitiveTopic(
    topic: Omit<SensitiveTopic, "_id" | "userId" | "createdAt">,
  ): Promise<SensitiveTopic> {
    const newTopic: SensitiveTopic = {
      ...topic,
      _id: `topic_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: this.deps.userId,
      createdAt: new Date(),
    };

    this.sensitiveTopics.push(newTopic);

    // TODO: Persist to MongoDB

    this.deps.logger.info(
      `[SettingsManager] Added sensitive topic with ${topic.keywords.length} keywords`,
    );
    return newTopic;
  }

  /**
   * Update a sensitive topic
   */
  async updateSensitiveTopic(
    topicId: string,
    updates: Partial<Omit<SensitiveTopic, "_id" | "userId" | "createdAt">>,
  ): Promise<void> {
    const index = this.sensitiveTopics.findIndex((t) => t._id === topicId);
    if (index === -1) {
      throw new Error(`Sensitive topic not found: ${topicId}`);
    }

    this.sensitiveTopics[index] = {
      ...this.sensitiveTopics[index],
      ...updates,
    };

    // TODO: Persist to MongoDB

    this.deps.logger.info(`[SettingsManager] Updated sensitive topic`);
  }

  /**
   * Delete a sensitive topic
   */
  async deleteSensitiveTopic(topicId: string): Promise<void> {
    const index = this.sensitiveTopics.findIndex((t) => t._id === topicId);
    if (index === -1) {
      throw new Error(`Sensitive topic not found: ${topicId}`);
    }

    this.sensitiveTopics.splice(index, 1);

    // TODO: Delete from MongoDB

    this.deps.logger.info(`[SettingsManager] Deleted sensitive topic`);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Load system presets
   */
  private loadSystemPresets(): void {
    const now = new Date();
    this.presets = SYSTEM_PRESETS.map((preset, index) => ({
      ...preset,
      _id: `system_preset_${index}`,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Load default sensitive topics
   */
  private loadDefaultSensitiveTopics(): void {
    const now = new Date();
    this.sensitiveTopics = DEFAULT_SENSITIVE_TOPICS.map((topic, index) => ({
      ...topic,
      _id: `default_topic_${index}`,
      userId: this.deps.userId,
      createdAt: now,
    }));
  }

  /**
   * Dispose of the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.deps.logger.info("[SettingsManager] Disposed");
  }
}
