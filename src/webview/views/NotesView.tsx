import React, { useState } from 'react';
import {
  FileText,
  Star,
  MoreHorizontal,
  ChevronLeft,
  MessageSquare,
  StickyNote,
  Bot,
  Send,
  Clock,
  ChevronDown,
  ChevronRight,
  Pin,
  Edit,
  Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

// --- Types ---
interface TranscriptionSegment {
  id: string;
  time: string;
  text: string;
  speaker?: string;
  isImportant?: boolean;
}

interface Note {
  id: string;
  title: string;
  createdAt: string;
  summary: string;
  decisions: string[];
  actionItems: { text: string; done: boolean }[];
  isPinned?: boolean;
}

interface DailyFolder {
  id: string;
  date: string;
  isToday?: boolean;
  isStarred?: boolean;
  transcriptions: TranscriptionSegment[];
  notes: Note[];
}

// --- Mock Data ---
const mockFolders: DailyFolder[] = [
  {
    id: '1',
    date: 'January 31, 2026',
    isToday: true,
    isStarred: false,
    transcriptions: [
      { id: 't1', time: '09:00', text: 'Good morning everyone. Let\'s start with the standup.', speaker: 'Alex' },
      { id: 't2', time: '09:02', text: 'I finished the API integration yesterday. Today I\'ll work on tests.', speaker: 'Sarah' },
      { id: 't3', time: '09:05', text: 'We need to discuss the deployment timeline for Q1.', speaker: 'Alex', isImportant: true },
    ],
    notes: [
      {
        id: 'n1',
        title: 'Morning Standup Notes',
        createdAt: '09:15 AM',
        summary: 'Team discussed Q1 deployment timeline and API integration progress.',
        decisions: ['Move deployment to Feb 15', 'Add extra QA cycle'],
        actionItems: [
          { text: 'Sarah to complete API tests by Friday', done: false },
          { text: 'Alex to draft deployment checklist', done: true },
        ],
        isPinned: true,
      }
    ]
  },
  {
    id: '2',
    date: 'January 30, 2026',
    isStarred: true,
    transcriptions: [
      { id: 't4', time: '14:00', text: 'Client meeting about the new feature requirements.', speaker: 'Client' },
    ],
    notes: [
      {
        id: 'n2',
        title: 'Client Meeting - Feature Requirements',
        createdAt: '02:45 PM',
        summary: 'Discussed new dashboard features and timeline expectations.',
        decisions: ['Prioritize analytics dashboard', 'Defer mobile app to Q2'],
        actionItems: [
          { text: 'Send proposal by Monday', done: false },
        ],
      }
    ]
  },
  {
    id: '3',
    date: 'January 29, 2026',
    transcriptions: [],
    notes: []
  }
];

// --- Components ---

const FolderList: React.FC<{
  folders: DailyFolder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ folders, selectedId, onSelect }) => {
  return (
    <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Daily Notes</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => onSelect(folder.id)}
            className={clsx(
              "w-full p-4 text-left border-b border-zinc-100 dark:border-zinc-800 transition-colors",
              selectedId === folder.id
                ? "bg-white dark:bg-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={clsx(
                "text-sm font-semibold",
                folder.isToday ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
              )}>
                {folder.isToday ? 'Today' : folder.date}
              </span>
              {folder.isStarred && <Star size={14} className="text-amber-500 fill-amber-500" />}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{folder.transcriptions.length} transcripts</span>
              <span>{folder.notes.length} notes</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const TranscriptionsTab: React.FC<{ transcriptions: TranscriptionSegment[] }> = ({ transcriptions }) => {
  const [expandedHours, setExpandedHours] = useState<string[]>(['09', '14']);

  // Group by hour
  const grouped = transcriptions.reduce((acc, t) => {
    const hour = t.time.split(':')[0];
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(t);
    return acc;
  }, {} as Record<string, TranscriptionSegment[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([hour, segments]) => (
        <div key={hour} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedHours(prev =>
              prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]
            )}
            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between"
          >
            <span className="text-sm font-medium text-zinc-900 dark:text-white">{hour}:00 - {hour}:59</span>
            {expandedHours.includes(hour) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedHours.includes(hour) && (
            <div className="p-4 space-y-3 bg-white dark:bg-zinc-950">
              {segments.map(seg => (
                <div key={seg.id} className={clsx(
                  "flex gap-3 p-2 rounded-lg",
                  seg.isImportant && "bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                )}>
                  <span className="text-xs font-mono text-zinc-400 shrink-0">{seg.time}</span>
                  <div>
                    {seg.speaker && <span className="text-xs font-semibold text-zinc-500 mr-2">{seg.speaker}:</span>}
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{seg.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {transcriptions.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p>No transcriptions for this day</p>
        </div>
      )}
    </div>
  );
};

const NotesTab: React.FC<{ notes: Note[] }> = ({ notes }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {notes.map(note => (
        <div key={note.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 group">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white">{note.title}</h4>
              <span className="text-xs text-zinc-500">{note.createdAt}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {note.isPinned && <Pin size={14} className="text-zinc-400" />}
              <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"><Edit size={14} /></button>
              <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{note.summary}</p>

          {note.decisions.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Key Decisions</h5>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                {note.decisions.map((d, i) => <li key={i}>• {d}</li>)}
              </ul>
            </div>
          )}

          {note.actionItems.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Action Items</h5>
              <ul className="text-sm space-y-1">
                {note.actionItems.map((item, i) => (
                  <li key={i} className={clsx("flex items-center gap-2", item.done && "line-through text-zinc-400")}>
                    <input type="checkbox" checked={item.done} readOnly className="rounded" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
      {notes.length === 0 && (
        <div className="col-span-2 text-center py-12 text-zinc-400">
          <StickyNote size={32} className="mx-auto mb-3 opacity-30" />
          <p>No notes for this day</p>
        </div>
      )}
    </div>
  );
};

const AIChatTab: React.FC = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you understand your notes from this day. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Based on your notes, the main decision was to move the deployment to February 15th with an additional QA cycle.'
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={clsx(
              "max-w-[80%] rounded-xl px-4 py-2",
              msg.role === 'user'
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this day's notes..."
          className="flex-1 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-zinc-400"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

const FolderDetail: React.FC<{ folder: DailyFolder; onBack: () => void }> = ({ folder, onBack }) => {
  const [activeTab, setActiveTab] = useState<'transcriptions' | 'notes' | 'ai'>('transcriptions');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {folder.isToday ? 'Today' : folder.date}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock size={12} />
              <span>{folder.transcriptions.length} transcripts • {folder.notes.length} notes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <Star size={18} className={folder.isStarred ? "text-amber-500 fill-amber-500" : "text-zinc-400"} />
          </button>
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        {[
          { id: 'transcriptions', label: 'Transcript', icon: MessageSquare },
          { id: 'notes', label: 'Notes', icon: StickyNote },
          { id: 'ai', label: 'AI Chat', icon: Bot },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'transcriptions' && <TranscriptionsTab transcriptions={folder.transcriptions} />}
        {activeTab === 'notes' && <NotesTab notes={folder.notes} />}
        {activeTab === 'ai' && <AIChatTab />}
      </div>
    </div>
  );
};

// --- Main Component ---
export const NotesView: React.FC = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const selectedFolder = mockFolders.find(f => f.id === selectedFolderId);

  return (
    <div className="flex h-full bg-white dark:bg-black">
      <FolderList
        folders={mockFolders}
        selectedId={selectedFolderId}
        onSelect={setSelectedFolderId}
      />
      {selectedFolder ? (
        <FolderDetail folder={selectedFolder} onBack={() => setSelectedFolderId(null)} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-400">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a day to view notes</p>
            <p className="text-sm">Choose from the list on the left</p>
          </div>
        </div>
      )}
    </div>
  );
};
