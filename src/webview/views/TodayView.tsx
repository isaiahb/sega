import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar,
  MessageSquareText,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSSE,
  type TranscriptEvent,
  type NotesReadyEvent,
  type ResearchStartedEvent,
  type ResearchProgressEvent,
  type StateUpdateEvent,
  type MeetingStartedEvent,
} from "../hooks/useSSE";
import { api, type AppState, type TranscriptSegment } from "../api/client";
import { fetchWithFallback } from "../lib/devMode";

// Assets
import glassesG1 from "../assets/glasses-g1.png";
import glassesHUD from "../assets/glasses-hud.png";

// Even Realities logo SVG path
const evenRealitiesSvgPath =
  "M7.18536 0.0734575C7.3836 0.171586 7.29624 0.196119 6.81366 0.176843L6.18324 0.151873L6.20592 1.73245L6.22818 3.31302H4.80186H3.37554L3.339 1.74384L3.30246 0.174653L1.68462 0.175091H0.0667802L0.0331802 8.41572L0 16.6559L0.40194 16.7483C0.62286 16.7987 1.38054 16.7974 2.0853 16.7444L3.36714 16.6489V15.1108V13.5732H4.78674H6.20634L6.24288 15.1594L6.27942 16.7457H12.6214H18.9634L19.0012 15.0788C19.0252 14.0389 18.9874 13.3471 18.9013 13.2389C18.7921 13.1018 17.4926 13.069 12.679 13.083L6.59484 13.1005L6.63138 11.714L6.6675 10.3275L11.8448 10.3038C14.6924 10.2907 17.4762 10.2565 18.031 10.228L19.0403 10.1763L19.0021 8.46566L18.9634 6.75542L18.3809 6.6678C18.0608 6.61917 15.2796 6.58895 12.2006 6.60034L6.60282 6.62049V5.23661V3.85317L12.6538 3.85098C15.9818 3.84966 18.779 3.79929 18.8706 3.73927C18.9945 3.65691 19.0268 3.19343 19 1.90417L18.9634 0.179034L17.1515 0.135226C10.7058 -0.0198526 6.951 -0.0430705 7.18536 0.0734575ZM6.21474 8.44288V9.79303H4.79094H3.36714V8.44288V7.09317H4.79094H6.21474V8.44288Z";

// --- Types ---
interface Note {
  time: string;
  text: string;
  isSystem?: boolean;
}

interface TodayViewProps {
  onNavigate?: (view: string) => void;
  userId: string;
}

// --- G1 Status Bar Component ---
const G1StatusBar = ({
  isRecording,
  hudText,
  hasActiveSession,
}: {
  isRecording: boolean;
  hudText: string;
  hasActiveSession: boolean;
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Left: Glasses image or HUD */}
        <div className="relative shrink-0 w-[200px] h-[100px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isRecording ? (
              <motion.img
                key="glasses"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                src={glassesG1}
                alt="Even Realities G1"
                className="h-full w-auto object-contain"
              />
            ) : (
              <motion.div
                key="hud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full"
              >
                <img
                  src={glassesHUD}
                  alt="HUD View"
                  className="w-full h-full object-contain"
                />
                {/* Text Overlay */}
                <div
                  className="absolute text-left overflow-hidden flex items-center"
                  style={{
                    left: "43.5%",
                    top: "15%",
                    width: "30%",
                    bottom: "28%",
                  }}
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={hudText}
                    className="font-mono text-[#00b869] text-[8px] leading-tight whitespace-pre-wrap break-words"
                  >
                    {hudText}
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      _
                    </motion.span>
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Brand & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-6 relative text-zinc-900 dark:text-white">
              <svg
                className="block size-full"
                fill="currentColor"
                viewBox="0 0 19 17"
              >
                <path
                  clipRule="evenodd"
                  d={evenRealitiesSvgPath}
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              G1 STATUS
            </h3>
            <div className="flex items-center gap-1.5 ml-auto">
              {isRecording ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
                    LIVE
                  </span>
                </>
              ) : hasActiveSession ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
                    CONNECTED
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    OFFLINE
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status cards */}
          <div className="flex gap-3">
            {isRecording ? (
              <>
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span className="text-sm font-medium">
                      Recording Active
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <circle cx="12" cy="20" r="1" />
                    </svg>
                    <span className="text-sm">Streaming to MentraOS</span>
                  </div>
                </div>
              </>
            ) : hasActiveSession ? (
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Ready to capture - start speaking to begin
                </span>
              </div>
            ) : (
              <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Open MentraOS app to connect glasses
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export const TodayView: React.FC<TodayViewProps> = ({ onNavigate, userId }) => {
  const { lastEvent, isConnected, events } = useSSE(userId);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // State for data
  const [notes, setNotes] = useState<Note[]>([]);
  const [hudText, setHudText] = useState("");
  const [interimText, setInterimText] = useState<string>("");

  // Auto-scroll ref
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when notes change
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes, interimText]);

  // ==========================================================================
  // Load initial data from backend API
  // ==========================================================================

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load app state to check if we're in a meeting
      const { data: appState } = await fetchWithFallback<AppState>(
        () => api.getState(),
        { isRecording: false, meetingState: "idle" },
        "Failed to load app state",
      );

      if (appState) {
        setIsRecording(
          appState.isRecording || appState.meetingState === "meeting_active",
        );
        setHasActiveSession((appState as any).hasActiveSession === true);
      }

      // Load today's transcript
      const { data: transcriptData } = await fetchWithFallback<
        TranscriptSegment[]
      >(() => api.getTranscriptToday(), [], "Failed to load transcript");

      if (transcriptData && transcriptData.length > 0) {
        const transformedNotes = transcriptData
          .filter((seg) => seg.isFinal)
          .slice(-100)
          .map((seg) => ({
            time: new Date(seg.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            text: seg.text,
          }));
        setNotes(transformedNotes);
      } else {
        setNotes([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ==========================================================================
  // Handle all SSE events from backend
  // ==========================================================================

  useEffect(() => {
    if (!lastEvent) return;

    console.log(`[TodayView] Processing event: ${lastEvent.type}`, lastEvent);

    switch (lastEvent.type) {
      // Real-time transcription from glasses
      case "transcript": {
        const event = lastEvent as TranscriptEvent;

        // Auto-detect that we're receiving audio
        if (!isRecording) {
          setIsRecording(true);
          setHasActiveSession(true);
        }

        if (event.isFinal) {
          const timeStr = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          setNotes((prev) => [...prev, { time: timeStr, text: event.text }]);
          setInterimText("");
        } else {
          setInterimText(event.text || "");
        }

        // Update HUD with transcript text
        setHudText(event.text || "");
        break;
      }

      // Display preview - shows what's on the glasses HUD
      case "display_preview": {
        const event = lastEvent as any;
        if (event.content) {
          setHudText(event.content);
        }
        // Mark as recording/active when receiving display events
        if (!isRecording) {
          setIsRecording(true);
          setHasActiveSession(true);
        }
        break;
      }

      // Session started
      case "session_started": {
        setHasActiveSession(true);
        setHudText("Glasses connected.\nReady to capture.");
        loadInitialData();
        break;
      }

      // State updates from backend
      case "state_update": {
        const event = lastEvent as StateUpdateEvent;
        setIsRecording(event.status === "meeting_active");
        break;
      }

      // Meeting detected
      case "meeting_started": {
        const event = lastEvent as MeetingStartedEvent;
        setIsRecording(true);
        setHudText(
          `Meeting Started\nType: ${event.classification?.category || "General"}`,
        );
        break;
      }

      // Meeting ended
      case "meeting_ended": {
        setHudText("Meeting ended.\nProcessing notes...");
        break;
      }

      // Notes are ready
      case "notes_ready": {
        const event = lastEvent as NotesReadyEvent;
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setNotes((prev) => [
          ...prev,
          {
            time: timeStr,
            text: `📋 Notes generated: ${event.summary || "Meeting notes ready"}`,
            isSystem: true,
          },
        ]);
        setHudText("Notes generated!\nCheck your email.");
        break;
      }

      // Research started
      case "research_started": {
        const event = lastEvent as ResearchStartedEvent;
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setNotes((prev) => [
          ...prev,
          {
            time: timeStr,
            text: `🔍 Starting: ${event.query}`,
            isSystem: true,
          },
        ]);
        setHudText(`🔍 Researching:\n${event.query}`);
        setIsRecording(true);
        break;
      }

      // Research progress
      case "research_progress": {
        const event = lastEvent as ResearchProgressEvent;
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setNotes((prev) => [
          ...prev,
          { time: timeStr, text: `📊 ${event.message}`, isSystem: true },
        ]);
        setHudText(event.message);
        break;
      }

      // Research complete
      case "research_complete": {
        const event = lastEvent as any;
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setNotes((prev) => [
          ...prev,
          {
            time: timeStr,
            text: `✅ Complete: ${event.summary || "Results available"}`,
            isSystem: true,
          },
        ]);
        setHudText(event.summary || "Research complete!");
        break;
      }
    }
  }, [lastEvent, isRecording, loadInitialData]);

  // Clock update
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black p-6 gap-4 overflow-hidden">
      {/* HEADER: Date, Time & Status */}
      <header className="flex items-end justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
            {formattedTime}
            <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
              UTC-7
            </span>
          </h2>
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium">
            <Calendar size={16} />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi size={14} className="text-emerald-500" />
            ) : (
              <WifiOff size={14} className="text-zinc-400" />
            )}
            {userId && (
              <span
                className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded max-w-[100px] truncate cursor-help"
                title={`User: ${userId}`}
              >
                {userId.split("@")[0]}
              </span>
            )}
            {!userId && (
              <span
                className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded cursor-help"
                title="Not authenticated - open from MentraOS app"
              >
                NO AUTH
              </span>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={loadInitialData}
            disabled={loading}
            className={clsx(
              "p-1.5 rounded-lg transition-colors",
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
            )}
            title="Refresh data"
          >
            <RefreshCw
              size={14}
              className={clsx("text-zinc-400", loading && "animate-spin")}
            />
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              System Status
            </div>
            <div
              className={clsx(
                "text-sm font-semibold",
                isRecording ? "text-red-500" : "text-emerald-500",
              )}
            >
              {isRecording ? "ACTIVE UPLINK" : "ALL SYSTEMS NOMINAL"}
            </div>
          </div>
          <div
            className={clsx(
              "w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] transition-all duration-500",
              isRecording
                ? "bg-red-500 text-red-500 animate-pulse"
                : "bg-emerald-500 text-emerald-500",
            )}
          />
        </div>
      </header>

      {/* G1 STATUS BAR - Horizontal on top */}
      <G1StatusBar
        isRecording={isRecording}
        hudText={hudText}
        hasActiveSession={hasActiveSession}
      />

      {/* LIVE TRANSCRIPT - Full width below */}
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquareText size={16} className="text-zinc-500" />
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
              Live Transcript
            </h3>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium text-red-500 uppercase">
                Recording
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {notes.length === 0 && !isRecording ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 py-8">
              <MessageSquareText size={24} className="opacity-30" />
              <p className="text-sm text-center">
                {hasActiveSession
                  ? "No transcript yet. Start speaking to see live transcription."
                  : "Connect your glasses to see live transcription."}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notes.map((note, i) => (
                <motion.div
                  key={`${note.time}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={clsx(
                    "flex gap-3",
                    note.isSystem &&
                      "bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 -mx-2",
                  )}
                >
                  <span className="text-xs font-mono text-zinc-400 shrink-0 mt-0.5">
                    {note.time}
                  </span>
                  <p
                    className={clsx(
                      "text-sm leading-relaxed",
                      note.isSystem
                        ? "text-zinc-600 dark:text-zinc-300 font-medium"
                        : "text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {note.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {/* Interim text (live typing) */}
          {interimText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <span className="text-xs font-mono text-zinc-400 shrink-0 mt-0.5">
                {new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                {interimText}
                <span className="inline-block w-1 h-4 bg-emerald-500 ml-1 animate-pulse" />
              </p>
            </motion.div>
          )}
          {/* Listening indicator */}
          {isRecording && !interimText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 py-2 text-sm text-zinc-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Listening...
            </motion.div>
          )}
          {/* Auto-scroll anchor */}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
};
