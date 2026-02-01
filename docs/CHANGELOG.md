# SEGA Changelog

All notable changes to the SEGA (Smart Executive Glasses Assistant) project.

## [Unreleased] - Backend Branch

### Branch: `backend` (off of `dev`)

This branch contains the complete backend rewrite using a manager-based architecture.

---

## 2025-02-01 - Phase 4: Persistence & Frontend API

### Added
- **MongoDB Service** (`src/services/db/index.ts`)
  - Mongoose connection management (connect/disconnect)
  - Models for all data types:
    - `DailyTranscript` - Daily transcript storage with segments
    - `Meeting` - Meeting records with transcript ranges
    - `Note` - Meeting notes with key points and decisions
    - `ActionItem` - Action items with priority and status
    - `ResearchResult` - Research results with sources
    - `UserSettings` - User preferences
    - `MeetingPreset` - Meeting detection presets
    - `SensitiveTopic` - Privacy keywords
  - Helper functions for common queries
  - Proper indexes for efficient queries

- **Complete API Endpoints** (`src/api/router.ts`)
  - **Transcript**: `/today`, `/:date`, `/:date/range`
  - **Meetings**: list with filters, get by ID, end, process
  - **Notes**: CRUD, generate-summary, email
  - **Actions**: CRUD with status/priority filters
  - **Research**: start, status, by meeting, email
  - **Settings**: GET, PUT, PATCH
  - **Presets**: CRUD
  - **Sensitive Topics**: list, add, remove
  - **State**: get, recording start/stop, glasses transcript toggle

### Changed
- **TranscriptManager**: Now persists segments to MongoDB via `appendTranscriptSegments()`
- **MeetingManager**: Full MongoDB persistence for all meeting operations
  - Create, end, cancel meetings
  - Update classification, topics, attendees
  - Link notes, action items, research
- **SettingsManager**: Added `removePreset()` and `removeSensitiveTopic()` methods
- **SegaApp**: Connects to MongoDB on startup, graceful shutdown

### Notes
- App works without MongoDB (in-memory fallback)
- Frontend API client (`src/webview/api/client.ts`) is now fully compatible

---

## 2026-01-31 - Phase 3: Research

### Added
- **ResearchManager** (`src/app/session/ResearchManager.ts`)
  - Firecrawl integration for web search and scraping
  - LLM-powered search query generation (optimizes queries for better results)
  - Multi-source research with deduplication
  - Research synthesis with summary and key facts extraction
  - Real-time progress tracking via SSE (0% → 100%)
  - Quick research mode for fast facts lookup
  - URL scraping capability for specific pages
  - Results caching for quick access
  - Meeting linking (research automatically attached to active meetings)

- **Research API Endpoints** (`src/api/router.ts`)
  - `POST /api/research` - Start full research query
  - `GET /api/research/status` - Check Firecrawl availability
  - `GET /api/research/:id` - Get research result by ID
  - `GET /api/research/results` - Get all cached results
  - `POST /api/research/quick` - Quick facts lookup
  - `POST /api/research/scrape` - Scrape specific URL

- **CLI Test Tool** (`src/cli/test-research.ts`)
  - Tests Firecrawl availability
  - Tests full research workflow
  - Tests URL scraping
  - Tests quick research mode
  - Tests concurrent research queries

### Changed
- Updated `UserSession` to include `ResearchManager`
- Connected `AgentManager` to `ResearchManager` for voice-triggered research

---

## 2026-01-31 - Phase 2: Intelligence

### Added
- **AgentManager** (`src/app/session/AgentManager.ts`) - The "brain" of SEGA
  - 5-second analysis loop with LLM (Gemini or Anthropic)
  - Meeting detection from transcript context
  - Meeting classification (investor_update, board_meeting, one_on_one, etc.)
  - Preset matching based on meeting context
  - Voice command parsing ("SEGA, research...", "SEGA, take note...")
  - Sensitive content detection and handling
  - State machine: `idle` → `detecting` → `in_meeting` → `processing` → `researching`
  - Autonomy levels: `capture_only`, `suggest`, `act`
  - Manual meeting control (start/end)
  - Pending command queue for confirmation mode

- **NotesManager** (`src/app/session/NotesManager.ts`)
  - LLM-powered meeting note generation
  - Action item extraction with:
    - Description
    - Assignee (if mentioned)
    - Due date (if mentioned)
    - Priority (low/medium/high/urgent)
    - Source text from transcript
  - Respects preset note rules:
    - Detail level (brief/standard/detailed)
    - Capture decisions toggle
    - Capture action items toggle
    - Custom instructions
  - Notes caching for quick access
  - Broadcasts `notes_ready` and `action_item` events via SSE

- **CLI Test Tool** (`src/cli/test-agent.ts`)
  - Tests meeting detection
  - Tests command parsing
  - Tests sensitive content detection
  - Tests manual meeting control
  - Tests autonomy levels
  - Interactive mode for manual testing

### Changed
- Updated `UserSession`:
  - Added `AgentManager` and `NotesManager`
  - Agent starts automatically on session initialization
  - Transcripts routed to `AgentManager.onNewTranscript()`

---

## 2026-01-31 - Phase 1: Foundation

### Added
- **New Directory Structure**
  ```
  src/
  ├── app/
  │   ├── index.ts                # SegaApp extends AppServer
  │   └── session/
  │       ├── UserSession.ts      # Container for all managers
  │       ├── TranscriptManager.ts
  │       ├── BroadcastManager.ts
  │       ├── DisplayManager.ts
  │       ├── SettingsManager.ts
  │       ├── MeetingManager.ts
  │       ├── AgentManager.ts     # Added in Phase 2
  │       ├── NotesManager.ts     # Added in Phase 2
  │       ├── ResearchManager.ts  # Added in Phase 3
  │       ├── types.ts            # Shared types
  │       └── index.ts            # Exports
  ├── api/
  │   └── router.ts               # Hono API routes
  ├── services/
  │   └── llm/                    # LLM provider abstraction
  │       ├── types.ts
  │       ├── gemini.ts
  │       ├── anthropic.ts
  │       └── index.ts
  └── cli/                        # Test tools
      ├── test-session.ts
      ├── test-agent.ts
      └── test-research.ts
  ```

- **UserSession** (`src/app/session/UserSession.ts`)
  - Static session management (get/create/remove)
  - Container for all per-user managers
  - Lifecycle management (initialize/dispose)
  - Logger with user prefix
  - Transcription routing

- **TranscriptManager** (`src/app/session/TranscriptManager.ts`)
  - In-memory transcript buffering
  - 5-minute flush interval to database
  - Day change detection (new DailyTranscript per day)
  - Segment indexing for meeting references
  - Recent transcript retrieval (by count or range)

- **BroadcastManager** (`src/app/session/BroadcastManager.ts`)
  - SSE client management per user
  - Heartbeat to keep connections alive
  - Typed event broadcasting:
    - `transcript`
    - `meeting_started`, `meeting_ended`, `meeting_classified`
    - `notes_ready`, `action_item`
    - `research_progress`, `research_complete`
    - `state_change`, `error`
  - Static methods for cross-user broadcasts

- **DisplayManager** (`src/app/session/DisplayManager.ts`)
  - Glasses display control via MentraOS SDK
  - Live transcript toggle
  - Message priority system (low/normal/high/urgent)
  - Auto-clear with duration
  - Meeting indicators (started/ended)
  - Research progress display
  - Status messages

- **SettingsManager** (`src/app/session/SettingsManager.ts`)
  - User settings management (autonomy level, display preferences)
  - 7 system presets:
    1. Investor Update
    2. Board Meeting
    3. 1:1 Meeting
    4. Team Standup
    5. Client Call
    6. Interview
    7. Networking
  - Custom preset support
  - Sensitive topics with 4 defaults:
    - Salary/compensation
    - Layoffs/termination
    - Medical/health
    - Legal/lawsuits
  - Preset matching by context

- **MeetingManager** (`src/app/session/MeetingManager.ts`)
  - Meeting lifecycle (start/end/cancel)
  - Transcript range tracking (startIndex, endIndex)
  - Meeting classification updates
  - Topic and attendee tracking
  - Sensitive meeting flagging
  - Note/action item/research linking
  - Recent meetings cache

- **SegaApp** (`src/app/index.ts`)
  - Extends MentraOS `AppServer`
  - `onSession`: Creates UserSession, subscribes to events
  - `onStop`: Handles disconnection
  - Button press handling (status, toggle transcript, end meeting)

- **API Router** (`src/api/router.ts`)
  - Health check with SSE client count
  - User info endpoint
  - SSE event stream
  - Transcript endpoints (recent, daily)
  - Meeting endpoints (active, recent, by ID, end)
  - Settings endpoints (get, update, presets, sensitive topics)
  - Research endpoints (start, status, results, quick, scrape)

- **LLM Services** (`src/services/llm/`)
  - Unified provider interface
  - Gemini provider (Gemini 3 Flash/Pro)
  - Anthropic provider (Claude Haiku/Sonnet)
  - Factory function with env detection
  - Tool calling support
  - Streaming support

- **Types** (`src/app/session/types.ts`)
  - `TranscriptSegment`, `DailyTranscript`
  - `Meeting`, `MeetingCategory`, `MeetingStatus`
  - `Note`, `ActionItem`, `ActionItemStatus`, `ActionItemPriority`
  - `UserSettings`, `MeetingPreset`, `SensitiveTopic`
  - `ResearchRequest`, `ResearchResult`, `ResearchStatus`
  - `SessionState`, `AnalysisResult`
  - SSE event types

- **CLI Test Tool** (`src/cli/test-session.ts`)
  - Tests all managers individually
  - Full meeting simulation
  - Tests without actual glasses

### Changed
- Updated `src/index.ts` to use new app architecture
- Moved LLM providers from `backend/services/agent/llm/` to `src/services/llm/`

### Notes
- Old `src/backend/` code kept for reference (to be removed after merge)
- MongoDB persistence marked as TODO (Phase 4)
- Email via Resend marked as TODO (Phase 5)

---

## Commits

| Hash | Phase | Description |
|------|-------|-------------|
| `531c621` | Phase 1 | Foundation - New manager architecture |
| `532bf17` | Phase 2 | Intelligence - AgentManager and NotesManager |
| `4c96ded` | Phase 3 | Research - ResearchManager with Firecrawl |
| `44f24fc` | Docs | Add comprehensive CHANGELOG.md |
| `f267d59` | Phase 4 | Add MongoDB service with mongoose models |
| `483ec92` | Phase 4 | Add MongoDB persistence and complete API endpoints |

---

## Environment Variables

```bash
# Required
PACKAGE_NAME=com.mentra.sega.isaiah
MENTRAOS_API_KEY=your_api_key

# AI Provider (at least one required)
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional
FIRECRAWL_API_KEY=your_firecrawl_key  # For research
RESEND_API_KEY=your_resend_key        # For email (Phase 5)
MONGODB_URI=mongodb://...             # For persistence (Phase 4)
```

---

## CLI Commands

```bash
# Run all Phase 1 tests
bun run src/cli/test-session.ts

# Simulate a full meeting
bun run src/cli/test-session.ts --simulate-meeting

# Test specific managers
bun run src/cli/test-session.ts --test=transcript
bun run src/cli/test-session.ts --test=meeting
bun run src/cli/test-session.ts --test=settings
bun run src/cli/test-session.ts --test=session

# Test AgentManager
bun run src/cli/test-agent.ts --test-manual
bun run src/cli/test-agent.ts --test-sensitive
bun run src/cli/test-agent.ts --interactive

# Test ResearchManager
bun run src/cli/test-research.ts
bun run src/cli/test-research.ts --query "OpenAI" --type company
bun run src/cli/test-research.ts --quick "Sam Altman"
bun run src/cli/test-research.ts --url "https://example.com"
```

---

## Remaining Work

### Phase 4: Persistence ✅ COMPLETE
- [x] MongoDB connection setup
- [x] Mongoose models for all types
- [x] Persist DailyTranscripts
- [x] Persist Meetings
- [x] Persist Notes and ActionItems
- [x] Persist Research results
- [x] Persist User settings

### Phase 5: Polish
- [ ] Email via Resend (reports, summaries)
- [ ] Error handling improvements
- [ ] Rate limiting
- [ ] Settings UI integration
- [ ] Remove old `src/backend/` code
- [ ] Production deployment config
- [ ] Test with real glasses end-to-end