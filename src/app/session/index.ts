/**
 * SEGA Session Module
 * Exports all session managers and types
 */

// Main container
export { UserSession } from "./UserSession";
export type { SessionLogger } from "./UserSession";

// Managers
export { TranscriptManager } from "./TranscriptManager";
export { BroadcastManager } from "./BroadcastManager";
export { DisplayManager } from "./DisplayManager";
export type { DisplayPriority } from "./DisplayManager";
export { SettingsManager } from "./SettingsManager";
export { MeetingManager } from "./MeetingManager";
export { AgentManager } from "./AgentManager";
export { NotesManager } from "./NotesManager";

// Types
export type {
  // Transcript
  TranscriptSegment,
  DailyTranscript,

  // Meeting
  Meeting,
  MeetingCategory,
  MeetingStatus,

  // Notes
  Note,
  NoteDetailLevel,
  ActionItem,
  ActionItemStatus,
  ActionItemPriority,

  // Settings
  UserSettings,
  MeetingPreset,
  SensitiveTopic,
  AutonomyLevel,
  NoteRules,
  ResearchTriggers,

  // Research
  ResearchRequest,
  ResearchResult,
  ResearchStatus,

  // Agent State
  SessionState,
  AnalysisResult,

  // SSE Events
  SSEEventType,
  SSEEvent,
  TranscriptEvent,
  MeetingStartedEvent,
  MeetingEndedEvent,
  NotesReadyEvent,
  ResearchProgressEvent,
  StateChangeEvent,
  AnySSEEvent,
} from "./types";
