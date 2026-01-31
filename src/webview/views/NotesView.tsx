import React, { useState } from 'react';
import { mockFolders, DailyFolder } from '../lib/mockData';
import { FolderList } from '../components/notes/FolderList';
import { FolderDetail } from '../components/notes/FolderDetail';
import { FileText } from 'lucide-react';

export const NotesView: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState<DailyFolder | null>(mockFolders[0] || null);

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-black overflow-hidden">
      {/* Left Panel - Folder List */}
      <div className="w-72 shrink-0 hidden md:block">
        <FolderList
          folders={mockFolders}
          selectedFolderId={selectedFolder?.id || null}
          onSelectFolder={setSelectedFolder}
        />
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
            folders={mockFolders}
            selectedFolderId={null}
            onSelectFolder={setSelectedFolder}
          />
        </div>
      )}
    </div>
  );
};
