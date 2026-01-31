import React, { useState } from 'react';
import {
  List,
  LayoutGrid,
  Plus,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  User
} from 'lucide-react';
import { clsx } from 'clsx';

// --- Types ---
interface ActionItem {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  owner?: string;
  dueDate?: string;
}

// --- Mock Data ---
const mockActions: ActionItem[] = [
  { id: '1', text: 'Complete API tests', status: 'in-progress', priority: 'high', owner: 'Sarah', dueDate: 'Feb 2' },
  { id: '2', text: 'Draft deployment checklist', status: 'done', priority: 'medium', owner: 'Alex', dueDate: 'Feb 1' },
  { id: '3', text: 'Send proposal to client', status: 'todo', priority: 'high', owner: 'You', dueDate: 'Feb 3' },
  { id: '4', text: 'Review security audit findings', status: 'todo', priority: 'medium', owner: 'Mike' },
  { id: '5', text: 'Update documentation', status: 'in-progress', priority: 'low', owner: 'Sarah', dueDate: 'Feb 5' },
  { id: '6', text: 'Schedule team retrospective', status: 'done', priority: 'low', owner: 'Alex' },
];

// --- Components ---

const PriorityBadge: React.FC<{ priority: ActionItem['priority'] }> = ({ priority }) => {
  const colors = {
    high: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };

  return (
    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full capitalize", colors[priority])}>
      {priority}
    </span>
  );
};

const StatusIndicator: React.FC<{ status: ActionItem['status'] }> = ({ status }) => {
  const colors = {
    'todo': 'text-zinc-400',
    'in-progress': 'text-amber-500',
    'done': 'text-emerald-500',
  };

  return status === 'done'
    ? <CheckCircle2 size={18} className={colors[status]} />
    : status === 'in-progress'
    ? <Clock size={18} className={colors[status]} />
    : <Circle size={18} className={colors[status]} />;
};

const ListView: React.FC<{ actions: ActionItem[] }> = ({ actions }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Task</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Owner</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Due Date</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {actions.map(action => (
            <tr key={action.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="px-4 py-3">
                <span className={clsx(
                  "text-sm",
                  action.status === 'done' ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"
                )}>
                  {action.text}
                </span>
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={action.priority} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <span className="text-xs font-medium">{action.owner?.[0] || '?'}</span>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{action.owner || 'Unassigned'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-zinc-500">{action.dueDate || '-'}</span>
              </td>
              <td className="px-4 py-3">
                <StatusIndicator status={action.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const KanbanView: React.FC<{ actions: ActionItem[] }> = ({ actions }) => {
  const columns = [
    { id: 'todo', title: 'To Do', items: actions.filter(a => a.status === 'todo') },
    { id: 'in-progress', title: 'In Progress', items: actions.filter(a => a.status === 'in-progress') },
    { id: 'done', title: 'Done', items: actions.filter(a => a.status === 'done') },
  ];

  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      {columns.map(column => (
        <div key={column.id} className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{column.title}</h3>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
              {column.items.length}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {column.items.map(action => (
              <div
                key={action.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 cursor-move hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-zinc-900 dark:text-white font-medium">{action.text}</p>
                  <PriorityBadge priority={action.priority} />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <span className="text-[10px] font-medium">{action.owner?.[0] || '?'}</span>
                    </div>
                    <span>{action.owner}</span>
                  </div>
                  {action.dueDate && <span>{action.dueDate}</span>}
                </div>
              </div>
            ))}
            <button className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-sm">
              + Add Task
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export const ActionsView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Actions</h1>
          <p className="text-sm text-zinc-500">Track tasks and action items from your meetings</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === 'list'
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === 'kanban'
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 rounded-lg">
            <Filter size={16} />
            Filter
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} />
            New Action
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'list' ? (
          <ListView actions={mockActions} />
        ) : (
          <KanbanView actions={mockActions} />
        )}
      </div>
    </div>
  );
};
