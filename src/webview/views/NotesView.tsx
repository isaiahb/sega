import React, { useState, useEffect, useCallback } from "react";
import { DailyFolder, Note as MockNote } from "../lib/mockData";
import { FolderList } from "../components/notes/FolderList";
import { FolderDetail } from "../components/notes/FolderDetail";
import { FileText, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { api, type Note, type Meeting } from "../api/client";
import { useSSE, type NotesReadyEvent } from "../hooks/useSSE";
import { fetchWithFallback } from "../lib/devMode";
import { SkeletonLoader, ErrorState } from "../components/shared";
import { clsx } from "clsx";
import { subDays, format, isToday, isYesterday } from "date-fns";

export const NotesView: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<DailyFolder | null>(
    null,
  );
  const [folders, setFolders] = useState<DailyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lastEvent, isConnected } = useSSE(null); // Listen for new notes

  // Load notes from backend
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all notes from backend (not filtered by date to get all available)
      const { data: realNotes, isMock: notesMock } = await fetchWithFallback(
        async () => {
          const notes = await api.getNotes();
          return notes;
        },
        [],
        "Failed to load notes from backend",
      );

      // Also fetch meetings to get more context
      const { data: realMeetings, isMock: meetingsMock } =
        await fetchWithFallback(
          async () => {
            const meetings = await api.getMeetings();
            return meetings;
          },
          [],
          "Failed to load meetings from backend",
        );

      const isMock = notesMock && meetingsMock;

      if (
        (realNotes && realNotes.length > 0) ||
        (realMeetings && realMeetings.length > 0)
      ) {
        // Group notes by date
        const notesByDate = new Map<string, Note[]>();
        const meetingsByDate = new Map<string, Meeting[]>();

        // Group notes
        realNotes.forEach((note) => {
          const date = note.date || new Date().toISOString().split("T")[0];
          if (!notesByDate.has(date)) {
            notesByDate.set(date, []);
          }
          notesByDate.get(date)!.push(note);
        });

        // Group meetings
        realMeetings.forEach((meeting) => {
          const date = meeting.date || new Date().toISOString().split("T")[0];
          if (!meetingsByDate.has(date)) {
            meetingsByDate.set(date, []);
          }
          meetingsByDate.get(date)!.push(meeting);
        });

        // Get all unique dates - only dates with actual data
        const allDates = new Set([
          ...notesByDate.keys(),
          ...meetingsByDate.keys(),
        ]);

        // Don't add empty days - only show days with actual data

        // Transform to DailyFolder format
        const transformedFolders: DailyFolder[] = Array.from(allDates)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Most recent first
          .map((date, idx) => {
            const notes = notesByDate.get(date) || [];
            const meetings = meetingsByDate.get(date) || [];
            const dateObj = new Date(date);

            // Transform notes to the expected format
            const transformedNotes: MockNote[] = notes.map((note, noteIdx) => ({
              id: note.id || `note-${date}-${noteIdx}`,
              title: note.summary?.substring(0, 50) || "Untitled Note",
              createdAt: note.timeRange?.start
                ? new Date(note.timeRange.start).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : format(dateObj, "h:mm a"),
              summary: note.summary || "",
              decisions: note.keyDecisions || [],
              actionItems: (note.actionItems || []).map((ai) => ({
                id: ai.id,
                text: ai.task,
                done: ai.status === "done",
                owner: ai.owner,
                dueDate: ai.dueDate ? new Date(ai.dueDate) : undefined,
                status:
                  ai.status === "done"
                    ? "done"
                    : ai.status === "in_progress"
                      ? "in-progress"
                      : "todo",
                priority: ai.priority,
              })),
              isPinned: note.isStarred,
            }));

            // Also add meetings as notes if they don't have associated notes
            meetings.forEach((meeting, meetingIdx) => {
              // Check if this meeting already has a note
              const hasNote = notes.some((n) => n.meetingId === meeting.id);
              if (!hasNote && meeting.status === "complete") {
                transformedNotes.push({
                  id: `meeting-${meeting.id}`,
                  title: `Meeting: ${meeting.category || "General"}`,
                  createdAt: new Date(meeting.startTime).toLocaleTimeString(
                    "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  ),
                  summary: `Meeting from ${new Date(meeting.startTime).toLocaleTimeString()} to ${meeting.endTime ? new Date(meeting.endTime).toLocaleTimeString() : "ongoing"}. ${meeting.detectedParticipants?.length || 0} participants detected.`,
                  decisions: [],
                  actionItems: [],
                  isPinned: false,
                });
              }
            });

            return {
              id: `folder-${date}`,
              date: dateObj,
              isToday: isToday(dateObj),
              isTranscribing:
                isToday(dateObj) && meetings.some((m) => m.status === "active"),
              isStarred: notes.some((n) => n.isStarred),
              transcriptions: [], // Can be populated from transcript API if needed
              notes: transformedNotes,
              audio: [],
            };
          });

        setFolders(transformedFolders);

        // Select the first folder (most recent) if none selected
        if (!selectedFolder && transformedFolders.length > 0) {
          setSelectedFolder(transformedFolders[0]);
        }
      } else {
        // No data - show empty state (no mock data)
        setFolders([]);
        setSelectedFolder(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      // No mock data on error - show empty state
      setFolders([]);
      setSelectedFolder(null);
    } finally {
      setLoading(false);
    }
  }, [selectedFolder]);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Listen for new notes and refresh
  useEffect(() => {
    if (lastEvent?.type === "notes_ready") {
      console.log("[NotesView] New notes ready, refreshing...");
      loadNotes();
    }
  }, [lastEvent, loadNotes]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
        <div className="w-72 shrink-0 hidden md:block border-r border-zinc-200 dark:border-zinc-800 p-4">
          <SkeletonLoader variant="list" count={5} />
        </div>
        <div className="flex-1 min-w-0 p-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center p-6">
          <ErrorState message={error} onRetry={loadNotes} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Left Panel - Folder List */}
      <div className="w-72 shrink-0 hidden md:block">
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolder?.id || null}
          onSelectFolder={setSelectedFolder}
        />

        {/* Status Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={12} className="text-emerald-500" />
              ) : (
                <WifiOff size={12} className="text-zinc-400" />
              )}
            </div>
            <button
              onClick={loadNotes}
              disabled={loading}
              className={clsx(
                "p-1 rounded transition-colors",
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-800",
              )}
              title="Refresh notes"
            >
              <RefreshCw
                size={12}
                className={clsx("text-zinc-400", loading && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Folder Detail */}
      <div className="flex-1 min-w-0">
        {selectedFolder ? (
          <FolderDetail
            folder={selectedFolder}
            onClose={() => setSelectedFolder(null)}
          />
        ) : folders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 p-8">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              <FileText size={32} />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                No notes yet
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
                Notes and transcriptions will appear here after your first
                meeting with your glasses connected.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              <FileText size={32} />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                Select a day
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
                Choose a day from the list to view transcriptions and notes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Folder List (shown when no folder selected) */}
      {!selectedFolder && (
        <div className="absolute inset-0 md:hidden">
          <FolderList
            folders={folders}
            selectedFolderId={null}
            onSelectFolder={setSelectedFolder}
          />
        </div>
      )}
    </div>
  );
};
