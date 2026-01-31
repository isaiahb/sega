import React, { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  Wifi,
  WifiOff,
  User,
  Glasses
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '../ui/command';
import { GlassesPreviewModal } from '../shared/GlassesPreviewModal';

interface TopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  title?: string;
  onNavigate?: (view: string) => void;
  isConnected?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  title,
  onNavigate,
  isConnected = true
}) => {
  const [open, setOpen] = useState(false);
  const [glassesOpen, setGlassesOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex items-center justify-between px-4 sticky top-0 z-20">

      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-200">
           <span className="text-zinc-400 dark:text-zinc-600">Executive Lens</span>
           <span className="text-zinc-300 dark:text-zinc-700">/</span>
           <span>{title || 'Dashboard'}</span>
        </div>
      </div>

      {/* Center: Search Trigger */}
      <div className="flex-1 flex justify-center max-w-lg">
        <button
          onClick={() => setOpen(true)}
          className="w-full max-w-md flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
            <span>Search or command...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-zinc-50 dark:bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex-1 flex items-center justify-end gap-3">

        {/* Glasses Preview Action */}
        <button
          onClick={() => setGlassesOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
            <Glasses size={14} />
            <span>Glasses Preview</span>
        </button>

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Status Pills */}
        <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-full font-medium">
                  <Wifi size={12} />
                  <span className="hidden xl:inline">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs rounded-full font-medium">
                  <WifiOff size={12} />
                  <span className="hidden xl:inline">Disconnected</span>
              </div>
            )}
        </div>

        {/* User */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-400 dark:from-zinc-800 dark:to-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300 ring-2 ring-white dark:ring-black">
            <User size={14} />
        </button>
      </div>

      {/* Command Palette Modal */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>Start Capture</CommandItem>
            <CommandItem>Create Meeting Note</CommandItem>
            <CommandItem>Run Research</CommandItem>
            <CommandItem>Send Summary Email</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { onNavigate?.('today'); setOpen(false); }}>Go to Today</CommandItem>
            <CommandItem onSelect={() => { onNavigate?.('notes'); setOpen(false); }}>Go to Notes</CommandItem>
            <CommandItem onSelect={() => { onNavigate?.('actions'); setOpen(false); }}>Go to Actions</CommandItem>
            <CommandItem onSelect={() => { onNavigate?.('agents'); setOpen(false); }}>Go to Agents</CommandItem>
            <CommandItem onSelect={() => { onNavigate?.('settings'); setOpen(false); }}>Go to Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Glasses Preview Modal */}
      <GlassesPreviewModal open={glassesOpen} onOpenChange={setGlassesOpen} />

    </div>
  );
};
