import React, { useState } from 'react';
import { format, isToday } from 'date-fns';
import { Star, ArrowRight, Sparkles, ChevronDown, Check, FolderOpen, Trash2, FileText, Smartphone, X } from 'lucide-react';
import { clsx } from 'clsx';
import { DailyFolder, Note } from '@/app/lib/mockData';
import { Drawer } from 'vaul';

interface FolderListProps {
  folders: DailyFolder[];
  onFolderClick: (folderId: string) => void;
  onNoteClick: (folderId: string, noteId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleStar: (folderId: string) => void;
  onGlobalChat: () => void;
  showBrandHeader?: boolean;
  className?: string;
  selectedId?: string | null;
}

const FolderRow = ({
  folder,
  onClick,
  onToggleStar,
  isSelected
}: {
  folder: DailyFolder;
  onClick: () => void;
  onToggleStar: () => void;
  isSelected?: boolean;
}) => {
  const metaCounts = [];
  if (folder.transcriptions?.length > 0) metaCounts.push(`${folder.transcriptions.length} transcripts`);
  if (folder.notes?.length > 0) metaCounts.push(`${folder.notes.length} notes`);
  
  return (
    <div 
        onClick={onClick}
        className={clsx(
            "group flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-all px-6",
            isSelected 
                ? "bg-zinc-100 dark:bg-zinc-800 border-transparent" 
                : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
        )}
    >
        <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
                <h3 className={clsx("text-sm font-medium tracking-tight", isToday(folder.date) ? "text-zinc-900 dark:text-white font-semibold" : "text-zinc-700 dark:text-zinc-200")}>
                    {format(folder.date, 'EEEE, MMM d')}
                </h3>
                {folder.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
            </div>
            
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
                {metaCounts.length > 0 ? metaCounts.join(' · ') : 'Empty'}
            </div>
        </div>

        <div className="flex items-center gap-4">
            {folder.isStarred && (
                <Star size={12} className="text-zinc-400 dark:text-zinc-500 fill-zinc-400 dark:fill-zinc-500" />
            )}
        </div>
    </div>
  );
};

const NoteRow = ({
    note,
    folderDate,
    onClick,
    isSelected
}: {
    note: Note;
    folderDate: Date;
    onClick: () => void;
    isSelected?: boolean;
}) => {
    return (
        <div 
            onClick={onClick}
            className={clsx(
                "group flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-all px-6",
                isSelected 
                    ? "bg-zinc-100 dark:bg-zinc-800 border-transparent" 
                    : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
            )}
        >
             <div className="flex-1 min-w-0 pr-4">
                 <div className="flex items-center gap-2 mb-1">
                     <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate tracking-tight">{note.title}</h3>
                     {note.isPinned && <Star size={10} className="fill-zinc-400 text-zinc-400" />}
                 </div>
                 <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal flex items-center gap-2">
                     <span>{format(folderDate, 'MMM d')}</span>
                     <span>•</span>
                     <span className="truncate max-w-[200px]">{note.summary}</span>
                 </div>
             </div>
        </div>
    );
}

type FilterType = 'all' | 'unfiled' | 'trash' | 'note_mode' | 'call_mode' | 'pinned';

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  onFolderClick,
  onNoteClick,
  onDeleteFolder,
  onToggleStar,
  onGlobalChat,
  showBrandHeader = true,
  className,
  selectedId
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const allNotesWithMeta = folders.flatMap(f => (f.notes || []).map(n => ({ ...n, folderId: f.id, folderDate: f.date })));
  
  const getFilteredContent = () => {
      if (activeFilter === 'all') {
          return folders; 
      }
      
      if (activeFilter === 'pinned') {
          return allNotesWithMeta.filter(n => n.isPinned);
      }
      if (activeFilter === 'note_mode') {
          return allNotesWithMeta;
      }
      if (activeFilter === 'call_mode') {
          return [];
      }
      return [];
  };

  const filteredData = getFilteredContent();
  const isFolderView = activeFilter === 'all';
  const pinnedCount = folders.reduce((acc, f) => acc + (f.notes || []).filter(n => n.isPinned).length, 0);
  const noteCount = folders.reduce((acc, f) => acc + (f.notes || []).length, 0);

  const FilterOption = ({ 
      id, 
      label, 
      icon: Icon, 
      count 
  }: { 
      id: FilterType, 
      label: string, 
      icon: React.ElementType, 
      count?: number 
  }) => (
      <button 
          onClick={() => { setActiveFilter(id); setIsFilterOpen(false); }}
          className="w-full flex items-center justify-between py-3 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
      >
          <div className="flex items-center gap-3">
              <Icon size={20} className="text-zinc-500 dark:text-zinc-400" />
              <span className="text-base text-zinc-900 dark:text-zinc-100">{label}</span>
              {count !== undefined && <span className="text-zinc-400 dark:text-zinc-500 text-sm">({count})</span>}
          </div>
          {activeFilter === id && <Check size={18} className="text-zinc-900 dark:text-white" />}
      </button>
  );

  return (
    <div className={clsx("flex flex-col h-full bg-white dark:bg-black transition-colors", className)}>
      
      {/* Header */}
      {showBrandHeader ? (
          <div className="px-6 pt-12 pb-4 sticky top-0 bg-white dark:bg-black z-10 border-b border-zinc-100 dark:border-zinc-800 transition-colors flex items-center justify-between">
            <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 group -ml-2 px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Executive Lens</h1>
                <ChevronDown size={20} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors mt-1" />
            </button>
            <button 
                onClick={onGlobalChat}
                className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
                <Sparkles size={20} strokeWidth={1.5} />
            </button>
          </div>
      ) : (
          <div className="px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
             <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Entries</span>
             <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <ChevronDown size={16} />
             </button>
          </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-center px-6">
            <p className="text-zinc-900 dark:text-white font-medium mb-2 text-sm">No items found</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-[200px]">
              Try changing the filter or add new content.
            </p>
          </div>
        ) : (
            isFolderView ? (
                 <div className="flex flex-col">
                    {(filteredData as DailyFolder[]).map((folder) => (
                        <FolderRow
                            key={folder.id}
                            folder={folder}
                            onClick={() => onFolderClick(folder.id)}
                            onToggleStar={() => onToggleStar(folder.id)}
                            isSelected={selectedId === folder.id}
                        />
                    ))}
                 </div>
            ) : (
                <div className="flex flex-col">
                    {(filteredData as any[]).map((note) => (
                        <NoteRow 
                            key={note.id}
                            note={note}
                            folderDate={note.folderDate}
                            onClick={() => onNoteClick(note.folderId, note.id)}
                            isSelected={selectedId === note.id} // Not exact but close enough for now
                        />
                    ))}
                </div>
            )
        )}
      </div>

      {/* Filter Bottom Sheet (Only show if brand header is enabled, aka mobile) */}
      {showBrandHeader && (
        <Drawer.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto outline-none">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Filter & sort</span>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>
                    
                    <div className="p-4 space-y-6 overflow-y-auto max-h-[70vh]">
                        {/* Filters Content */}
                        <div className="space-y-1">
                            <FilterOption id="all" label="All files" icon={FolderOpen} count={folders.length} />
                            <FilterOption id="unfiled" label="Unfiled" icon={FileText} count={0} />
                            <FilterOption id="trash" label="Trash" icon={Trash2} count={0} />
                        </div>
                    </div>
                    <div className="h-6" /> 
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
};
