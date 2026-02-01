import React from 'react';
import { 
  Home, 
  FileText, 
  CheckSquare, 
  Bot, 
  Settings, 
  LifeBuoy
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  activeItem: string;
  onNavigate: (item: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeItem, onNavigate }) => {
  
  const navItems = [
    { id: 'today', label: 'Today', icon: Home },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'actions', label: 'Actions', icon: CheckSquare },
    { id: 'agents', label: 'Agents', icon: Bot },
  ];

  const utilityItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: LifeBuoy },
  ];

  return (
    <div 
      className={clsx(
        "h-screen bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out z-30 relative",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Brand */}
      <div className={clsx("h-14 flex items-center border-b border-transparent px-4", isOpen ? "justify-start" : "justify-center")}>
        <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0">
           <span className="text-white dark:text-zinc-900 font-bold text-lg">E</span>
        </div>
        {isOpen && (
           <span className="ml-3 font-bold text-lg text-zinc-900 dark:text-white tracking-tight animate-in fade-in duration-200">Executive Lens</span>
        )}
      </div>

      {/* Main Nav */}
      <div className="flex-1 py-6 space-y-1 px-2">
        {navItems.map((item) => {
           const isActive = activeItem === item.id;
           return (
             <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  "w-full flex items-center rounded-lg transition-colors group relative",
                  isOpen ? "px-3 py-2 gap-3" : "justify-center p-2",
                  isActive 
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
                title={!isOpen ? item.label : undefined}
             >
                <item.icon size={20} strokeWidth={1.5} className={isActive ? "text-zinc-900 dark:text-white" : ""} />
                {isOpen && (
                   <span className="font-medium text-sm animate-in fade-in slide-in-from-left-2 duration-200">{item.label}</span>
                )}
                
                {/* Active Indicator Line (Left) */}
                {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-zinc-900 dark:bg-white rounded-r-full" />
                )}
             </button>
           );
        })}
      </div>

      {/* Utility Nav */}
      <div className="py-4 space-y-1 px-2 border-t border-zinc-200 dark:border-zinc-800">
        {utilityItems.map((item) => (
             <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  "w-full flex items-center rounded-lg transition-colors group",
                  isOpen ? "px-3 py-2 gap-3" : "justify-center p-2",
                  activeItem === item.id
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
                title={!isOpen ? item.label : undefined}
             >
                <item.icon size={20} strokeWidth={1.5} />
                {isOpen && (
                   <span className="font-medium text-sm animate-in fade-in duration-200">{item.label}</span>
                )}
             </button>
        ))}
      </div>
      
    </div>
  );
};
