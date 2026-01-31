import React, { useState, useEffect } from 'react';
import { DailyFolder } from '@/app/lib/mockData';
import { ChevronLeft, Star, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { TranscriptionsTab } from '@/app/components/tabs/TranscriptionsTab';
import { NotesTab } from '@/app/components/tabs/NotesTab';
import { AIChatTab } from '@/app/components/tabs/AIChatTab';

interface FolderDetailProps {
  folder: DailyFolder;
  onBack: () => void;
  onToggleStar: () => void;
  initialTab?: 'transcription' | 'notes' | 'ai';
  showBackButton?: boolean;
}

export const FolderDetail: React.FC<FolderDetailProps> = ({ 
  folder, 
  onBack, 
  onToggleStar, 
  initialTab = 'transcription',
  showBackButton = true 
}) => {
  const mapInitialTab = (t: string) => {
      if (t === 'transcription') return 'transcriptions';
      if (t === 'ai') return 'chat';
      return t;
  };

  const [activeTab, setActiveTab] = useState<'transcriptions' | 'notes' | 'chat'>('transcriptions');

  useEffect(() => {
    setActiveTab(mapInitialTab(initialTab) as any);
  }, [initialTab]);

  const tabs = [
    { id: 'transcriptions', label: 'Transcript' },
    { id: 'notes', label: 'Notes' },
    { id: 'chat', label: 'AI' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800 transition-colors">
          <div className="px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {showBackButton && (
                    <button 
                        onClick={onBack} 
                        className="p-2 -ml-2 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} strokeWidth={1.5} />
                    </button>
                )}
                <span className={clsx("font-semibold text-zinc-900 dark:text-white", showBackButton ? "text-sm" : "text-lg")}>
                    {format(folder.date, 'MMMM d, yyyy')}
                </span>
            </div>
            
            <div className="flex items-center gap-1">
                <button onClick={onToggleStar} className={clsx("p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors", folder.isStarred ? "text-yellow-500" : "text-zinc-400 dark:text-zinc-400")}>
                    <Star size={20} fill={folder.isStarred ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
                <button className="p-2 -mr-2 text-zinc-400 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <MoreHorizontal size={20} strokeWidth={1.5} />
                </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="px-6 flex gap-8 border-b border-transparent">
              {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "pb-3 text-sm font-medium transition-colors relative",
                            isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                          {tab.label}
                          {isActive && (
                              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900 dark:bg-white rounded-full" />
                          )}
                      </button>
                  )
              })}
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-black transition-colors scrollbar-hide">
          <div className="h-full">
              {activeTab === 'transcriptions' && <TranscriptionsTab transcriptions={folder.transcriptions} />}
              {activeTab === 'notes' && <NotesTab notes={folder.notes} />}
              {activeTab === 'chat' && <AIChatTab date={folder.date} />}
          </div>
      </div>
    </div>
  );
};
