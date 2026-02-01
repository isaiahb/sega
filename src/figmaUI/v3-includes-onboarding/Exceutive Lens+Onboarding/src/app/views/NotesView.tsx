import React, { useState } from 'react';
import { FolderList } from '@/app/views/FolderList';
import { FolderDetail } from '@/app/views/FolderDetail';
import { mockFolders, DailyFolder } from '@/app/lib/mockData';
import { toast } from 'sonner';
import { Folder as FolderIcon } from 'lucide-react';
import { clsx } from 'clsx';

export const NotesView = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<DailyFolder[]>(mockFolders);
  const [initialTab, setInitialTab] = useState<'transcription' | 'notes' | 'ai'>('transcription');

  const handleFolderClick = (id: string) => {
    setSelectedFolderId(id);
    setInitialTab('transcription'); 
  };

  const handleNoteClick = (folderId: string, noteId: string) => {
      setSelectedFolderId(folderId);
      setInitialTab('notes'); 
  };

  const handleDeleteFolder = (id: string) => {
    if (confirm('Delete this day? This removes transcriptions and notes.')) {
        setFolders(prev => prev.filter(f => f.id !== id));
        toast.success('Folder deleted');
        if (selectedFolderId === id) setSelectedFolderId(null);
    }
  };

  const handleToggleStar = (id: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isStarred: !f.isStarred } : f));
  };

  const activeFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="flex h-full bg-white dark:bg-black">
        {/* Left Column: Daily Folders */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-black transition-all duration-300 z-10">
             <FolderList 
                folders={folders} 
                onFolderClick={handleFolderClick}
                onNoteClick={handleNoteClick}
                onDeleteFolder={handleDeleteFolder}
                onToggleStar={handleToggleStar}
                onGlobalChat={() => {}} // Not needed here
                showBrandHeader={false} 
                selectedId={selectedFolderId}
             />
        </div>

        {/* Right Column: Content */}
        <div className="flex-1 bg-white dark:bg-black md:bg-zinc-50 md:dark:bg-zinc-900/50 relative overflow-hidden">
            {selectedFolderId && activeFolder ? (
                <div className="h-full w-full">
                  <FolderDetail 
                      folder={activeFolder} 
                      onBack={() => setSelectedFolderId(null)}
                      onToggleStar={() => handleToggleStar(activeFolder.id)}
                      initialTab={initialTab}
                      showBackButton={false}
                  />
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                        <FolderIcon size={32} strokeWidth={1.5} className="opacity-50" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Select a day to view notes</p>
                </div>
            )}
        </div>
    </div>
  );
};
