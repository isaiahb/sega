import React, { useState } from 'react';
import { 
  Kanban, 
  List, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User 
} from 'lucide-react';
import { clsx } from 'clsx';
import { mockFolders } from '@/app/lib/mockData';

// Flatten actions from notes for demo
const allActions = mockFolders.flatMap(f => (f.notes || []).flatMap(n => n.actionItems.map(a => ({ ...a, noteTitle: n.title, date: f.date }))));

export const ActionsView = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
       {/* Header */}
       <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 flex-shrink-0">
           <div className="flex items-center gap-4">
               <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Action Items</h1>
               <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
               <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                   <button 
                      onClick={() => setViewMode('list')}
                      className={clsx(
                          "p-1.5 rounded-md transition-all",
                          viewMode === 'list' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                   >
                       <List size={16} />
                   </button>
                   <button 
                      onClick={() => setViewMode('kanban')}
                      className={clsx(
                          "p-1.5 rounded-md transition-all",
                          viewMode === 'kanban' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                   >
                       <Kanban size={16} />
                   </button>
               </div>
           </div>
           
           <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                   <Filter size={16} />
                   Filter
               </button>
               <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                   <Plus size={16} />
                   New Action
               </button>
           </div>
       </div>

       {/* Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6">
           
           {viewMode === 'list' ? (
               <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                   {/* Table Header */}
                   <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                       <div className="col-span-5">Task</div>
                       <div className="col-span-2">Priority</div>
                       <div className="col-span-2">Owner</div>
                       <div className="col-span-2">Due Date</div>
                       <div className="col-span-1 text-right">Status</div>
                   </div>
                   
                   {/* Rows */}
                   <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                       {allActions.length > 0 ? allActions.map((action, i) => (
                           <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                               <div className="col-span-5 flex items-start gap-3">
                                   <button className={clsx("mt-0.5 transition-colors", action.done ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400")}>
                                       {action.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                   </button>
                                   <div>
                                       <span className={clsx("text-sm font-medium transition-colors", action.done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-white")}>
                                           {action.text}
                                       </span>
                                       <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                                           Source: <span className="text-blue-600 dark:text-blue-400">{action.noteTitle || "Manual Entry"}</span>
                                       </div>
                                   </div>
                               </div>
                               
                               <div className="col-span-2">
                                    {action.priority === 'high' && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" /> High
                                        </span>
                                    )}
                                    {action.priority === 'medium' && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" /> Medium
                                        </span>
                                    )}
                                    {(!action.priority || action.priority === 'low') && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" /> Low
                                        </span>
                                    )}
                               </div>

                               <div className="col-span-2 flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                       {action.owner ? action.owner.substring(0, 2).toUpperCase() : 'ME'}
                                   </div>
                                   <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{action.owner || 'You'}</span>
                               </div>

                               <div className="col-span-2">
                                   <span className={clsx("text-sm", action.date ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600")}>
                                       {action.date ? action.date.toLocaleDateString() : 'No Date'}
                                   </span>
                               </div>

                               <div className="col-span-1 flex justify-end">
                                    {action.status === 'done' || action.done ? (
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" title="Done" />
                                    ) : action.status === 'in-progress' ? (
                                        <div className="w-2 h-2 rounded-full bg-amber-500" title="In Progress" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" title="To Do" />
                                    )}
                               </div>
                           </div>
                       )) : (
                            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                                <p>No actions found.</p>
                            </div>
                       )}
                   </div>
               </div>
           ) : (
               /* Kanban View */
               <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start">
                   {['To Do', 'In Progress', 'Done'].map((statusLabel) => {
                       const statusKey = statusLabel.toLowerCase().replace(' ', '-');
                       const columnItems = allActions.filter(a => {
                           if (statusKey === 'done') return a.status === 'done' || a.done;
                           if (statusKey === 'in-progress') return a.status === 'in-progress';
                           return !a.done && (a.status === 'todo' || !a.status);
                       });

                       return (
                           <div key={statusLabel} className="w-80 flex-shrink-0 flex flex-col max-h-full bg-zinc-100/50 dark:bg-zinc-900/30 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800/50">
                               <div className="flex items-center justify-between mb-3 px-1">
                                   <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{statusLabel}</h3>
                                   <span className="px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                       {columnItems.length}
                                   </span>
                               </div>
                               
                               <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                                   {columnItems.map((item, idx) => (
                                       <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={clsx(
                                                    "text-xs font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                                                    item.priority === 'high' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30" :
                                                    item.priority === 'medium' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30" :
                                                    "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700"
                                                )}>
                                                    {item.priority || 'Low'}
                                                </div>
                                                <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal size={14} />
                                                </button>
                                            </div>
                                            
                                            <p className={clsx("text-sm font-medium mb-3 line-clamp-2", item.done ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-white")}>
                                                {item.text}
                                            </p>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                    <Clock size={12} />
                                                    <span>{item.date ? item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}</span>
                                                </div>
                                                
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-400 ring-1 ring-white dark:ring-black">
                                                    {item.owner ? item.owner.substring(0, 1) : 'Y'}
                                                </div>
                                            </div>
                                       </div>
                                   ))}
                                   
                                   <button className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                                       + Add Task
                                   </button>
                               </div>
                           </div>
                       );
                   })}
               </div>
           )}

       </div>
    </div>
  );
};
