/**
 * SEGA Session Types
 * Shared types and interfaces for all session managers
 */

// =============================================================================
// Transcript Types
// =============================================================================

/**
 * A single transcript segment from the glasses
 */
export interface TranscriptSegment {
  /** The transcribed text */
  text: string;
  /** When this segment was received */
  timestamp: Date;
  /** Whether this is a final (vs interim) transcription */
  isFinal: boolean;
  /** Optional speaker hint from the glasses */
  speakerHint?: string;
  /** Index within the daily transcript */
  index?: number;
}

/**
 * Daily transcript - one document per user per day
 * Aggregates all transcript segments for efficient storage and retrieval
 */
export interface DailyTranscript {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** All segments for this day */
  segments: TranscriptSegment[];
  /** When this document was created */
  createdAt: Date;
  /** When this document was last updated */
  updatedAt: Date;
}

// =============================================================================
// Meeting Types
// =============================================================================

/**
 * Meeting category for classification
 */
export type MeetingCategory =
  | "investor_update"
  | "board_meeting"
  | "one_on_one"
  | "team_standup"
  | "client_call"
  | "interview"
  | "networking"
  | "personal"
  | "unknown";

/**
 * Meeting status in lifecycle
 */
export type MeetingStatus = "active" | "ended" | "cancelled";

/**
 * A detected meeting with transcript range reference
 */
export interface Meeting {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Meeting title (auto-generated or user-provided) */
  title: string;
  /** Meeting classification */
  category: MeetingCategory;
  /** Confidence score for classification (0-1) */
  classificationConfidence: number;
  /** Which preset was applied */
  presetId?: string;
  /** Meeting status */
  status: MeetingStatus;
  /** When the meeting started */
  startTime: Date;
  /** When the meeting ended (if ended) */
  endTime?: Date;
  /** Reference to daily transcript */
  transcriptDate: string;
  /** Start index in daily transcript segments */
  transcriptStartIndex: number;
  /** End index in daily transcript segments (updated when meeting ends) */
  transcriptEndIndex?: number;
  /** Detected attendees/participants */
  attendees: string[];
  /** Key topics discussed */
  topics: string[];
  /** Whether this meeting contains sensitive content */
  isSensitive: boolean;
  /** Reason for sensitivity (if sensitive) */
  sensitiveReason?: string;
  /** Associated note ID (if notes generated) */
  noteId?: string;
  /** Associated action item IDs */
  actionItemIds: string[];
  /** Associated research IDs */
  researchIds: string[];
  /** When this record was created */
  createdAt: Date;
  /** When this record was last updated */
  updatedAt: Date;
}

// =============================================================================
// Notes Types
// =============================================================================

/**
 * Detail level for note generation
 */
export type NoteDetailLevel = "brief" | "standard" | "detailed";

/**
 * A generated note from a meeting
 */
export interface Note {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Associated meeting ID */
  meetingId: string;
  /** Note title */
  title: string;
  /** Summary of the meeting */
  summary: string;
  /** Key points extracted */
  keyPoints: string[];
  /** Decisions made */
  decisions: string[];
  /** Full formatted content (markdown) */
  content: string;
  /** Detail level used for generation */
  detailLevel: NoteDetailLevel;
  /** When this note was created */
  createdAt: Date;
  /** When this note was last updated */
  updatedAt: Date;
}

/**
 * Action item status
 */
export type ActionItemStatus = "pending" | "in_progress" | "completed" | "cancelled";

/**
 * Action item priority
 */
export type ActionItemPriority = "low" | "medium" | "high" | "urgent";

/**
 * An extracted action item from a meeting
 */
export interface ActionItem {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Associated meeting ID */
  meetingId: string;
  /** Associated note ID */
  noteId?: string;
  /** Action item description */
  description: string;
  /** Who is assigned */
  assignee?: string;
  /** Due date if mentioned */
  dueDate?: Date;
  /** Priority level */
  priority: ActionItemPriority;
  /** Current status */
  status: ActionItemStatus;
  /** The transcript text that triggered this action item */
  sourceText?: string;
  /** When this action item was created */
  createdAt: Date;
  /** When this action item was last updated */
  updatedAt: Date;
}

// =============================================================================
// Settings Types
// =============================================================================

/**
 * User autonomy level for SEGA actions
 */
export type AutonomyLevel = "capture_only" | "suggest" | "act";

/**
 * Note generation rules for a preset
 */
export interface NoteRules {
  /** Level of detail for notes */
  detailLevel: NoteDetailLevel;
  /** Whether to capture decisions */
  captureDecisions: boolean;
  /** Whether to capture action items */
  captureActionItems: boolean;
  /** Custom instructions for note generation */
  customInstructions?: string;
}

/**
 * Research triggers for a preset
 */
export interface ResearchTriggers {
  /** Auto-research mentioned attendees */
  autoResearchAttendees: boolean;
  /** Auto-research mentioned companies */
  autoResearchCompanies: boolean;
  /** Auto-research key topics */
  autoResearchTopics: boolean;
  /** Custom trigger phrases */
  customTriggers?: string[];
}

/**
 * Meeting preset - defines how SEGA behaves for a type of meeting
 */
export interface MeetingPreset {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) - null for system presets */
  userId?: string;
  /** Preset name */
  name: string;
  /** Condition for matching (natural language) */
  condition: string;
  /** Meeting category this applies to */
  category: MeetingCategory;
  /** User context to provide to agent */
  userContext: string;
  /** Note generation rules */
  noteRules: NoteRules;
  /** Research triggers */
  researchTriggers: ResearchTriggers;
  /** Whether this preset is for sensitive meetings */
  sensitive?: boolean;
  /** Reason for sensitivity */
  sensitiveReason?: string;
  /** Whether this is a system preset (not editable) */
  isSystem?: boolean;
  /** Display order */
  order?: number;
  /** When this preset was created */
  createdAt: Date;
  /** When this preset was last updated */
  updatedAt: Date;
}

/**
 * Sensitive topic configuration
 */
export interface SensitiveTopic {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Keywords that trigger sensitivity */
  keywords: string[];
  /** Action when triggered: 'pause' stops capture, 'flag' marks as sensitive */
  action: "pause" | "flag";
  /** Whether this topic is active */
  enabled: boolean;
  /** When this topic was created */
  createdAt: Date;
}

/**
 * User settings
 */
export interface UserSettings {
  /** User ID (email) */
  userId: string;
  /** Default autonomy level */
  autonomyLevel: AutonomyLevel;
  /** Whether live transcript is shown on glasses */
  showLiveTranscript: boolean;
  /** User's email for reports */
  email?: string;
  /** User's display name */
  displayName?: string;
  /** User's company */
  company?: string;
  /** User's role/title */
  role?: string;
  /** When settings were created */
  createdAt: Date;
  /** When settings were last updated */
  updatedAt: Date;
}

// =============================================================================
// Research Types
// =============================================================================

/**
 * Research request status
 */
export type ResearchStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * A research request
 */
export interface ResearchRequest {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Associated meeting ID (if any) */
  meetingId?: string;
  /** Research query */
  query: string;
  /** Type of research */
  type: "person" | "company" | "topic" | "general";
  /** Current status */
  status: ResearchStatus;
  /** When the request was created */
  createdAt: Date;
}

/**
 * A completed research result
 */
export interface ResearchResult {
  /** Unique identifier */
  _id?: string;
  /** User ID (email) */
  userId: string;
  /** Associated meeting ID (if any) */
  meetingId?: string;
  /** Original query */
  query: string;
  /** Type of research */
  type: "person" | "company" | "topic" | "general";
  /** Summary of findings */
  summary: string;
  /** Key facts discovered */
  keyFacts: string[];
  /** Source URLs used */
  sources: Array<{
    url: string;
    title: string;
    snippet?: string;
  }>;
  /** Full research content (markdown) */
  content: string;
  /** When this research was completed */
  completedAt: Date;
  /** When this record was created */
  createdAt: Date;
}

// =============================================================================
// Agent State Types
// =============================================================================

/**
 * Session state tracked by AgentManager
 */
export type SessionState =
  | "idle"           // No active meeting, passively listening
  | "detecting"      // Analyzing if a meeting is starting
  | "in_meeting"     // Active meeting in progress
  | "processing"     // Meeting ended, generating notes/actions
  | "researching";   // Deep research in progress

/**
 * Analysis result from the agent
 */
export interface AnalysisResult {
  /** Whether a meeting was detected */
  meetingDetected: boolean;
  /** Whether the current meeting has ended */
  meetingEnded: boolean;
  /** Meeting classification (if detected) */
  classification?: {
    category: MeetingCategory;
    confidence: number;
    title: string;
    attendees: string[];
  };
  /** Whether sensitive content was detected */
  sensitiveDetected: boolean;
  /** Reason for sensitivity */
  sensitiveReason?: string;
  /** Matched preset ID (if any) */
  matchedPresetId?: string;
  /** Topics discussed */
  topics: string[];
  /** Commands detected (e.g., "SEGA, research...") */
  commands: Array<{
    type: "research" | "note" | "email" | "remind";
    content: string;
  }>;
}

// =============================================================================
// SSE Event Types
// =============================================================================

/**
 * SSE event types for real-time updates to web UI
 */
export type SSEEventType =
  | "connected"
  | "transcript"
  | "meeting_started"
  | "meeting_updated"
  | "meeting_ended"
  | "meeting_classified"
  | "notes_generating"
  | "notes_ready"
  | "action_item"
  | "research_started"
  | "research_progress"
  | "research_complete"
  | "state_change"
  | "error";

/**
 * Base SSE event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  timestamp: number;
}

/**
 * Transcript event
 */
export interface TranscriptEvent extends SSEEvent {
  type: "transcript";
  text: string;
  isFinal: boolean;
  speakerHint?: string;
}

/**
 * Meeting started event
 */
export interface MeetingStartedEvent extends SSEEvent {
  type: "meeting_started";
  meetingId: string;
  title: string;
  category: MeetingCategory;
  startTime: string;
}

/**
 * Meeting ended event
 */
export interface MeetingEndedEvent extends SSEEvent {
  type: "meeting_ended";
  meetingId: string;
  duration: number;
}

/**
 * Notes ready event
 */
export interface NotesReadyEvent extends SSEEvent {
  type: "notes_ready";
  noteId: string;
  meetingId: string;
  title: string;
  summary: string;
}

/**
 * Research progress event
 */
export interface ResearchProgressEvent extends SSEEvent {
  type: "research_progress";
  researchId: string;
  query: string;
  progress: number;
  currentStep: string;
}

/**
 * State change event
 */
export interface StateChangeEvent extends SSEEvent {
  type: "state_change";
  previousState: SessionState;
  newState: SessionState;
}

/**
 * Union of all SSE events
 */
export type AnySSEEvent =
  | SSEEvent
  | TranscriptEvent
  | MeetingStartedEvent
  | MeetingEndedEvent
  | NotesReadyEvent
  | ResearchProgressEvent
  | StateChangeEvent;
