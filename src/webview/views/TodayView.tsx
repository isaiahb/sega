import React, { useState, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  Play,
  Sparkles,
  Calendar,
  MessageSquareText,
  Search,
  Building2,
  TrendingUp,
  UserCheck,
  LayoutGrid,
  List,
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
  type MeetingEndedEvent,
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
}

interface ResearchItem {
  type: "person" | "company" | "market";
  title: string;
  subtitle: string;
  status: "verified" | "pending";
  details: string[];
}

interface TodayViewProps {
  onNavigate?: (view: string) => void;
  userId: string;
}

// --- Components ---

const DeviceCard = ({
  isRecording,
  hudText,
  hasActiveSession,
}: {
  isRecording: boolean;
  hudText: string;
  hasActiveSession: boolean;
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-full relative group">
      <AnimatePresence mode="wait">
        {!isRecording ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 flex flex-col justify-between p-5"
          >
            {/* Header: Brand & Status */}
            <div className="flex items-center justify-between z-10 w-full">
              <div className="flex items-center gap-2">
                <div className="h-4 w-5 relative text-zinc-900 dark:text-white">
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
                <span className="font-semibold text-zinc-900 dark:text-white tracking-tight text-sm">
                  Even Realities G1
                </span>
              </div>
              {hasActiveSession ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Not Connected
                  </span>
                </div>
              )}
            </div>

            {/* Center: Hero Image */}
            <div className="relative flex-1 flex items-center justify-center z-10 group-hover:scale-105 transition-transform duration-500 my-1">
              <motion.img
                layoutId="glasses-image"
                alt="Even Realities G1"
                className="w-full h-full object-contain max-h-[90px] drop-shadow-xl transform -rotate-1"
                src={glassesG1}
              />
            </div>

            {/* Footer: Status */}
            <div className="z-10 w-full">
              {hasActiveSession ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Ready to capture
                  </span>
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Open MentraOS app to connect glasses
                  </span>
                </div>
              )}
            </div>

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/30 to-zinc-100/50 dark:via-zinc-800/10 dark:to-zinc-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 flex items-center p-4 lg:p-6 gap-4 lg:gap-6 bg-zinc-50 dark:bg-zinc-800"
          >
            {/* Left: HUD Visual */}
            <div className="relative w-[60%] flex items-center justify-center">
              <img
                src={glassesHUD}
                alt="HUD View"
                className="w-full h-auto object-contain"
              />

              {/* Text Overlay */}
              <div
                className="absolute text-left overflow-hidden flex items-center"
                style={{
                  left: "43.5%",
                  top: "15.8%",
                  width: "30.3%",
                  bottom: "25%",
                }}
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={hudText}
                  className="font-mono text-[#00b869] text-[9px] lg:text-[14px] leading-relaxed whitespace-pre-wrap break-words"
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
            </div>

            {/* Right: Glasses Information Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 min-w-0 space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-6 relative text-zinc-900 dark:text-white">
                    <svg
                      className="block size-full"
                      viewBox="0 0 20 17"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.18536 0.0734575C7.3836 0.171586 7.29624 0.196119 6.81366 0.176843L6.18324 0.151873L6.20592 1.73245L6.22818 3.31302H4.80186H3.37554L3.339 1.74384L3.30246 0.174653L1.68462 0.175091H0.0667802L0.0331802 8.41572L0 16.6559L0.40194 16.7483C0.62286 16.7987 1.38054 16.7974 2.0853 16.7444L3.36714 16.6489V15.1108V13.5732H4.78674H6.20634L6.24288 15.1594L6.27942 16.7457H12.6214H18.9634L19.0012 15.0788C19.0252 14.0389 18.9874 13.3471 18.9013 13.2389C18.7921 13.1018 17.4926 13.069 12.679 13.083L6.59484 13.1005L6.63138 11.714L6.6675 10.3275L11.8448 10.3038C14.6924 10.2907 17.4762 10.2565 18.031 10.228L19.0403 10.1763L19.0021 8.46566L18.9634 6.75542L18.3809 6.6678C18.0608 6.61917 15.2796 6.58895 12.2006 6.60034L6.60282 6.62049V5.23661V3.85317L12.6538 3.85098C15.9818 3.84966 18.779 3.79929 18.8706 3.73927C18.9945 3.65691 19.0268 3.19343 19 1.90417L18.9634 0.179034L17.1515 0.135226C10.7058 -0.0198526 6.951 -0.0430705 7.18536 0.0734575ZM6.21474 8.44288V9.79303H4.79094H3.36714V8.44288V7.09317H4.79094H6.21474V8.44288Z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    G1 STATUS
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-2">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
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

                <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResearchEntity = ({
  type,
  title,
  subtitle,
  details,
  status,
}: ResearchItem) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 mt-0.5 shrink-0">
            {type === "person" ? (
              <UserCheck size={16} />
            ) : type === "company" ? (
              <Building2 size={16} />
            ) : (
              <TrendingUp size={16} />
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title}
            </h4>
            <p className="text-base text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div
          className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
            status === "verified"
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-zinc-200 text-zinc-500",
          )}
        >
          {status}
        </div>
      </div>

      <div className="space-y-2 pl-11">
        {details.map((detail: string, i: number) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <div className="mt-0.5 w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({ onNavigate, userId }) => {
  const { lastEvent, isConnected, events } = useSSE(userId);
  const [isRecording, setIsRecording] = useState(false);

  // Debug: Log userId on mount
  useEffect(() => {
    console.log("[TodayView] userId:", userId);
    console.log("[TodayView] SSE connected:", isConnected);
  }, [userId, isConnected]);

  // Debug: Log when lastEvent changes
  useEffect(() => {
    console.log("[TodayView] lastEvent changed:", lastEvent?.type, lastEvent);
    console.log("[TodayView] Total events:", events.length);
  }, [lastEvent, events.length]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // State for data - start empty, no mock data
  const [notes, setNotes] = useState<Note[]>([]);

  const [researchItems, setResearchItems] = useState<ResearchItem[]>([]);
  const [hudText, setHudText] = useState("");
  const [meetingActive, setMeetingActive] = useState(false);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);

  // ==========================================================================
  // Load initial data from backend API
  // ==========================================================================

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load app state to check if we're in a meeting
      const { data: appState, isMock: stateMock } =
        await fetchWithFallback<AppState>(
          () => api.getState(),
          { isRecording: false, meetingState: "idle" },
          "Failed to load app state",
        );

      if (appState) {
        setIsRecording(
          appState.isRecording || appState.meetingState === "meeting_active",
        );
        setMeetingActive(appState.meetingState === "meeting_active");
        if (appState.currentMeetingId) {
          setCurrentMeetingId(appState.currentMeetingId);
        }
        // Check if we have an active glasses session
        setHasActiveSession((appState as any).hasActiveSession === true);
      }

      // Load today's transcript
      const { data: transcriptData } = await fetchWithFallback<
        TranscriptSegment[]
      >(() => api.getTranscriptToday(), [], "Failed to load transcript");

      if (transcriptData && transcriptData.length > 0) {
        // Transform transcript segments to notes format
        const transformedNotes = transcriptData
          .filter((seg) => seg.isFinal)
          .slice(-50) // Last 50 final segments
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
        // No data - show empty state (no mock data)
        setNotes([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      // No mock data on error - show empty state
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

  // Track interim transcript separately from final notes
  const [interimText, setInterimText] = useState<string>("");

  useEffect(() => {
    if (!lastEvent) return;

    console.log(`[TodayView] Processing event: ${lastEvent.type}`, lastEvent);

    switch (lastEvent.type) {
      // Real-time transcription from glasses
      case "transcript": {
        const event = lastEvent as TranscriptEvent;
        console.log(
          `[TodayView] Transcript received: "${event.text}" (isFinal: ${event.isFinal})`,
        );

        // Auto-detect that we're receiving audio - set recording state
        if (!isRecording) {
          console.log(
            "[TodayView] Setting isRecording=true, hasActiveSession=true",
          );
          setIsRecording(true);
          setHasActiveSession(true);
        }

        if (event.isFinal) {
          // Final transcript - add as permanent note
          const timeStr = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          setNotes((prev) => [...prev, { time: timeStr, text: event.text }]);
          // Clear interim text since we got the final
          setInterimText("");
        } else {
          // Interim transcript - show as live typing indicator
          setInterimText(event.text || "");
        }

        setHudText(event.text || "");
        break;
      }

      // Session started - glasses just connected
      case "session_started": {
        console.log("[TodayView] Session started event received!");
        setHasActiveSession(true);
        setHudText("Glasses connected.\nReady to capture.");
        // Reload initial data now that session is active
        loadInitialData();
        break;
      }

      // State updates from backend
      case "state_update": {
        const event = lastEvent as StateUpdateEvent;
        setIsRecording(event.status === "meeting_active");
        setMeetingActive(event.status === "meeting_active");
        break;
      }

      // Meeting detected
      case "meeting_started": {
        const event = lastEvent as MeetingStartedEvent;
        setMeetingActive(true);
        setIsRecording(true);
        setCurrentMeetingId(event.meetingId);
        setMeetingStartTime(new Date(event.startTime));
        setHudText(
          `Meeting Started\nType: ${event.classification?.category || "General"}`,
        );
        break;
      }

      // Meeting ended - notes generation usually follows
      case "meeting_ended": {
        const event = lastEvent as MeetingEndedEvent;
        setMeetingActive(false);
        setIsRecording(false);
        setCurrentMeetingId(null);
        setMeetingStartTime(null);
        setHudText("Meeting ended.\nProcessing notes...");
        break;
      }

      // Notes are ready
      case "notes_ready": {
        const event = lastEvent as NotesReadyEvent;
        setHudText("Notes generated!\nAction items extracted.");
        // Action items are included in the event
        if (event.actionItems && event.actionItems.length > 0) {
          event.actionItems.forEach((item) => {
            const timeStr = new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            setNotes((prev) => [
              ...prev,
              { time: timeStr, text: `ACTION: ${item.task}` },
            ]);
          });
        }
        break;
      }

      // Research started
      case "research_started": {
        const event = lastEvent as ResearchStartedEvent;
        setHudText(`Researching: ${event.query}\nType: ${event.queryType}`);
        break;
      }

      // Research in progress
      case "research_progress": {
        const event = lastEvent as ResearchProgressEvent;
        setHudText(`Research in progress...\n${event.message}`);
        break;
      }

      // Research complete
      case "research_complete": {
        const event = lastEvent as any; // ResearchCompleteEvent
        if (event.results && event.results.length > 0) {
          const firstResult = event.results[0];
          setResearchItems((prev) => [
            {
              type: "person",
              title: firstResult.title,
              subtitle: firstResult.url,
              status: "verified",
              details: [
                firstResult.snippet ||
                  firstResult.content ||
                  "Research completed",
              ],
            },
            ...prev,
          ]);
        }
        setHudText(
          `Research complete!\n${event.summary || "Results available"}`,
        );
        break;
      }

      // Fallback for legacy agent_complete events
      case "agent_complete":
        if ((lastEvent as any).response?.glassesDisplay) {
          setHudText((lastEvent as any).response.glassesDisplay);
        }
        break;
    }
  }, [lastEvent]);

  // No demo sequence - all data comes from real backend/glasses

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      // If we have a meeting start time, calculate duration from it
      if (meetingStartTime) {
        setDuration(
          Math.floor((Date.now() - meetingStartTime.getTime()) / 1000),
        );
      }
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
      // Don't clear notes/research when stopping - keep the transcript visible
      // Only clear HUD text
      setHudText("");
    }
    return () => clearInterval(interval);
  }, [isRecording, meetingStartTime]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black p-6 gap-6 overflow-hidden">
      {/* HEADER: Date, Time & Status */}
      <header className="flex items-end justify-between shrink-0 pb-2">
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
            {/* Debug: Show userId */}
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
            {!hasActiveSession && userId && (
              <span
                className="text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded cursor-help"
                title="Glasses not connected. Connect your glasses to start capturing."
              >
                NO SESSION
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

      {/* ROW 1: Control & Device (Reduced Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 h-[200px]">
        {/* Live Session Control - DYNAMIC COL SPAN */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={clsx(
            "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm relative overflow-hidden group",
            isRecording ? "lg:col-span-1" : "lg:col-span-2",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between z-10 mb-2 shrink-0">
            <div className="flex items-center gap-3">
              <motion.div
                layout
                className={clsx(
                  "p-2.5 rounded-xl transition-colors shrink-0",
                  isRecording
                    ? "bg-red-50 text-red-500"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
                )}
              >
                <Mic size={20} />
              </motion.div>
              <motion.div layout>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Audio Intelligence
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isRecording
                        ? "bg-red-500 animate-pulse"
                        : "bg-zinc-300 dark:bg-zinc-600",
                    )}
                  />
                  <span className="text-xs text-zinc-500 font-medium">
                    {isRecording ? "Live Monitor" : "System Ready"}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Center - Timer Display */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-3 z-10 relative">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording-timer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative inline-block">
                    <span className="font-mono text-4xl font-bold text-zinc-900 dark:text-white tracking-tighter tabular-nums">
                      {formatDuration(duration)}
                    </span>
                    <div className="absolute -right-2 -top-2">
                      <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-500 font-bold  uppercase tracking-[0.2em] border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full">
                    Recording
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 -mt-[15px]"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full"
                        animate={{ height: [32, 24, 32] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!isRecording && (
              <span className="absolute bottom-0 text-xs font-medium text-zinc-400 shrink-0">
                Waiting for input...
              </span>
            )}
          </div>

          {/* Footer - Controls */}
          <div className="z-10 mt-2 min-w-0 shrink-0">
            <button
              onClick={() => {
                // Toggle recording state locally
                // Recording auto-starts when transcripts arrive from glasses
                // This button is mainly for manually ending a session
                if (isRecording) {
                  setIsRecording(false);
                  setHudText("");
                } else {
                  // Manual start - will auto-confirm when transcripts arrive
                  setIsRecording(true);
                  setHudText("Waiting for audio...");
                }
              }}
              className={clsx(
                "w-full py-3 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm text-sm border min-w-0",
                isRecording
                  ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                  : "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900",
              )}
            >
              {isRecording ? (
                <>
                  <Square size={16} fill="currentColor" className="shrink-0" />{" "}
                  <span className="truncate">End Session</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" className="shrink-0" />{" "}
                  <span className="truncate">Start Recording</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Device Card - DYNAMIC COL SPAN */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={clsx(isRecording ? "lg:col-span-2" : "lg:col-span-1")}
        >
          <DeviceCard
            isRecording={isRecording}
            hudText={hudText}
            hasActiveSession={hasActiveSession}
          />
        </motion.div>
      </div>

      {/* ROW 2: Notes & Research (Fill Remaining Height) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Live Summary (Left 1/3) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2 mt-[8px]">
              <MessageSquareText size={16} className="text-zinc-500" />
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider truncate">
                Live Transcript
              </h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
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
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                  >
                    <span className="text-sm font-mono text-zinc-400 shrink-0 mt-0.5">
                      {note.time}
                    </span>
                    <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {note.text}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-0 py-2 text-sm text-zinc-400 pl-11"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {interimText ? (
                  <span className="text-zinc-600 dark:text-zinc-300 italic">
                    {interimText}
                  </span>
                ) : (
                  "Listening..."
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* 2. Deep Intelligence (Right 2/3) */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col shadow-sm h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0 min-w-0 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles
                size={16}
                className="text-zinc-600 dark:text-zinc-400 shrink-0"
              />
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider truncate">
                Deep Intelligence
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View Toggle */}
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setViewMode("grid")}
                  className={clsx(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-600",
                  )}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={clsx(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-600",
                  )}
                >
                  <List size={14} />
                </button>
              </div>

              <span className="hidden sm:inline-block text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-md font-medium border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                AUTO-RESEARCH ACTIVE
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {researchItems.length === 0 && !isRecording ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3">
                <Search size={32} className="opacity-20" />
                <p className="text-sm">
                  Start recording to activate entity research...
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className={clsx(
                  "gap-4",
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2"
                    : "flex flex-col",
                )}
              >
                <AnimatePresence>
                  {researchItems.map((item, i) => (
                    <ResearchEntity key={i} {...item} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
