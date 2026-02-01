import React, { useState, useEffect } from 'react';
import { mockFolders, DailyFolder } from '../lib/mockData';
import { FolderList } from '../components/notes/FolderList';
import { FolderDetail } from '../components/notes/FolderDetail';
import { FileText } from 'lucide-react';
import { api } from '../api/client';
import { useSSE, type NotesReadyEvent } from '../hooks/useSSE';
import { fetchWithFallback } from '../lib/devMode';
import { SkeletonLoader, ErrorState } from '../components/shared';

export const NotesView: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<DailyFolder | null>(null);
  const [folders, setFolders] = useState<DailyFolder[]>(mockFolders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(true);

  const { lastEvent } = useSSE(null); // Listen for new notes
  const today = new Date().toISOString().split('T')[0];

  // Load notes from backend
  useEffect(() => {
    loadNotes();
  }, []);

  // Listen for new notes and refresh
  useEffect(() => {
    if (lastEvent?.type === 'notes_ready') {
      loadNotes();
    }
  }, [lastEvent]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from backend, fall back to mock data
      const { data: realNotes, isMock } = await fetchWithFallback(
        async () => {
          const notes = await api.getNotes({ date: today });
          return notes;
        },
        [],
        'Failed to load notes from backend'
      );

      setUsingMockData(isMock);

      if (realNotes && realNotes.length > 0) {
        // Transform backend Note[] to DailyFolder format for UI
        const transformedFolders: DailyFolder[] = [{
          id: today,
          date: today,
          meetings: realNotes.map((note, idx) => ({
            id: note.id || `meeting-${idx}`,
            time: note.timeRange?.start ? new Date(note.timeRange.start).toLocaleTimeString() : '00:00',
            title: note.summary.substring(0, 50) + (note.summary.length > 50 ? '...' : ''),
            transcript: note.summary, // Use summary as transcript preview
            notes: note.summary,
            actions: note.actionItems || [],
            detectedEntities: [],
          })),
          meetingCount: realNotes.length,
          lastModified: new Date(),
        }];
        setFolders(transformedFolders);
        setSelectedFolder(transformedFolders[0] || null);
      } else if (!isMock) {
        // Backend has no notes, show empty state
        setFolders([]);
        setSelectedFolder(null);
      } else {
        // Use mock data as fallback
        setFolders(mockFolders);
        setSelectedFolder(mockFolders[0] || null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setFolders(mockFolders);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

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
  if (error && !usingMockData) {
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
        {usingMockData && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 p-2 border-t border-zinc-200 dark:border-zinc-800 bg-yellow-50 dark:bg-yellow-900/20">
            Demo data (backend unavailable)
          </div>
        )}
      </div>

      {/* Right Panel - Folder Detail */}
      <div className="flex-1 min-w-0">
        {selectedFolder ? (
          <FolderDetail
            folder={selectedFolder}
            onClose={() => setSelectedFolder(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
              <FileText size={32} />
            </div>
            <div className="text-center">
              <p className="font-medium text-zinc-600 dark:text-zinc-400">Select a day</p>
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
